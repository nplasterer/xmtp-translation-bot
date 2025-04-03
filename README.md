# XMTP Translation Bot

This bot enables real-time translation between users who speak different languages using XMTP messaging and OpenAI's GPT model. Perfect for group chats where participants speak different languages!

## Features

- Instant message translation for groups
- Each user can set their preferred language
- Messages are automatically translated to each recipient's language
- Simple command interface
- Natural language understanding powered by GPT
- Shows language settings for all group members

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Set up your environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your `WALLET_KEY` (private key)
   - Generate a random `ENCRYPTION_KEY` (32-byte hex string)
   - Add your `OPENAI_API_KEY` (get one from platform.openai.com)

## Usage

1. Start the bot:

   ```bash
   yarn start
   ```

2. Set your preferred language:
   Send a message to the bot with the command:

   ```
   /setlang [language]
   ```

   Example: `/setlang Spanish`

   The bot will show you the current language settings for all participants in the group.

3. Group Chat Translation:
   - Each participant sets their preferred language once
   - When anyone sends a message, it's automatically translated into the preferred language of each other participant
   - Translations are marked with the target language (e.g., "[Spanish] Hola mundo")
   - You'll always see messages in your preferred language

## Example Scenario

1. Alice sets her language to English: `/setlang English`
2. Bob sets his language to Spanish: `/setlang Spanish`
3. Chen sets their language to Chinese: `/setlang Chinese`

Now when:

- Alice sends "Hello everyone"
  - Bob sees: "[Spanish] Hola a todos"
  - Chen sees: "[Chinese] 大家好"
- Bob sends "¿Cómo están?"
  - Alice sees: "[English] How are you?"
  - Chen sees: "[Chinese] 你们好吗？"

## Supported Languages

You can specify any language in natural language format. For example:

- English
- Spanish
- French
- German
- Italian
- Portuguese
- Chinese
- Japanese
- Korean
- Russian
- And many more!

## Note

Make sure you have a valid OpenAI API key with sufficient quota for your usage needs.
