import "dotenv/config";
import { createSigner, getEncryptionKeyFromHex } from "@helpers";
import { Client, type XmtpEnv, Conversation } from "@xmtp/node-sdk";
import OpenAI from "openai";

const { WALLET_KEY, ENCRYPTION_KEY, OPENAI_API_KEY } = process.env;

if (!WALLET_KEY) {
  throw new Error("WALLET_KEY must be set");
}

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY must be set");
}

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set");
}

const signer = createSigner(WALLET_KEY);
const encryptionKey = getEncryptionKeyFromHex(ENCRYPTION_KEY);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const env: XmtpEnv = process.env.XMTP_ENV !== undefined
  ? (process.env.XMTP_ENV as XmtpEnv)
  : "dev";

// Store user language preferences
const userLanguages = new Map<string, string>();

// Initialize XMTP client
let client: Client;

async function translateText(text: string, targetLang: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a translator. Translate the following text to ${targetLang}. Only respond with the translation, nothing else.`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.3
    });

    return response.choices[0].message.content || text;
  } catch (error) {
    console.error('Error translating text:', error);
    return text;
  }
}

async function translateForRecipients(
  text: string,
  senderLang: string,
  conversation: Conversation
): Promise<void> {
  // Get all participants in the conversation (excluding the bot)
  const participants = (await conversation.members())
    .map(p => p.inboxId.toLowerCase())
    .filter(id => id !== client.inboxId.toLowerCase()); // Exclude the bot
  
  // Create a set to track unique languages we need to translate to
  const targetLanguages = new Set<string>();
  
  // Add each participant's preferred language
  for (const participant of participants) {
    const participantLang = userLanguages.get(participant.toLowerCase());
    if (participantLang && participantLang !== senderLang) {
      targetLanguages.add(participantLang);
    }
  }

  // If we have translations to make
  if (targetLanguages.size > 0) {
    // Translate for each target language and build the message
    const translations = await Promise.all(
      Array.from(targetLanguages).map(async (targetLang) => {
        const translation = await translateText(text, targetLang);
        return `[${targetLang}] ${translation}`;
      })
    );

    // Send all translations in one message
    await conversation.send(translations.join('\n'));
  }
}

async function main() {
  console.log(`Creating client on the '${env}' network...`);
  client = await Client.create(signer, encryptionKey, { env });

  console.log("Syncing conversations...");
  await client.conversations.sync();

  const identifier = await signer.getIdentifier();
  const address = identifier.identifier;
  console.log(`Translation bot initialized on ${address}`);
  console.log("Waiting for messages...");

  const stream = client.conversations.streamAllMessages();

  for await (const message of await stream) {
    if (
      message?.senderInboxId.toLowerCase() === client.inboxId.toLowerCase() ||
      message?.contentType?.typeId !== "text"
    ) {
      continue;
    }

    const content = message.content as string;
    console.log(`Received message: ${content} from ${message.senderInboxId}`);

    const conversation = await client.conversations.getConversationById(
      message.conversationId,
    );

    if (!conversation) {
      console.log("Unable to find conversation, skipping");
      continue;
    }

    // Handle language setting command
    if (content.startsWith('/setlang ')) {
      const lang = content.split(' ')[1];
      userLanguages.set(message.senderInboxId.toLowerCase(), lang);
      await conversation.send(`Your language preference has been set to: ${lang}`);
      
      // Show current group language settings
      const participants = (await conversation.members())
        .map(p => p.inboxId.toLowerCase())
        .filter(id => id !== client.inboxId.toLowerCase()); // Exclude the bot
      
      const langSettings = participants
        .map(p => {
          const pLang = userLanguages.get(p.toLowerCase());
          return pLang ? `${p}: ${pLang}` : `${p}: not set`;
        })
        .join('\n');
      
      await conversation.send(`Current group language settings:\n${langSettings}`);
      continue;
    }

    // Get sender's language
    const senderLang = userLanguages.get(message.senderInboxId.toLowerCase());
    if (!senderLang) {
      await conversation.send(
        "Welcome! Please set your preferred language using the /setlang command followed by your language (e.g., /setlang Spanish, /setlang French, /setlang Chinese)"
      );
      continue;
    }

    // Translate the message for all other participants
    await translateForRecipients(content, senderLang, conversation);
  }
}

main().catch((error: unknown) => {
  console.error(
    "Unhandled error:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}); 