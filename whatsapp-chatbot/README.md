# WhatsApp Chatbot

This project is a WhatsApp chatbot that allows users to interact with a tarot reading service. The chatbot is built using Node.js and utilizes the WhatsApp Web API for messaging and Mercado Pago for payment processing.

## Project Structure

```
whatsapp-chatbot
├── src
│   └── chatbot3.js       # Main logic for the WhatsApp chatbot
├── package.json           # npm configuration file with dependencies
├── .gitignore             # Files and directories to be ignored by Git
└── README.md              # Documentation for the project
```

## Features

- User interaction through WhatsApp messages
- Payment processing via Mercado Pago
- Tarot reading service with multiple question options
- Dynamic response generation based on user input

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/whatsapp-chatbot.git
   ```

2. Navigate to the project directory:
   ```
   cd whatsapp-chatbot
   ```

3. Install the required dependencies:
   ```
   npm install
   ```

## Usage

1. Ensure you have a valid Mercado Pago account and replace the access token in `src/chatbot3.js`.
2. Run the chatbot:
   ```
   node src/chatbot3.js
   ```

3. Scan the QR code with your WhatsApp to connect.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.