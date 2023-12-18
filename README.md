# KrakenFutures_DCA_BOT

DCA, or Dollar Cost Averaging, is a simple trading strategy that helps you build or unwind a position while minimizing market risks. This strategy spreads out orders at regular intervals over time so your position is less affected by market timing. If you are looking to build savings and wealth in the long term, this bot is for you.

## Usage and Disclaimer

### Usage

Feel free to use and experiment with this bot! You can find the code and details on how to run it in the [source code repository](#your-github-repository-link).

### Contact

If you have any questions, suggestions, or just want to connect, you can reach me on LinkedIn: [Your LinkedIn Profile](#your-linkedin-profile-link).

### Disclaimer

This bot is provided for free and open-source use. By using this bot, you acknowledge and agree to the following:

- **No Responsibility**: The author takes no responsibility for any losses or unfavorable outcomes resulting from the use of this bot.

- **Testing Before Real Money**: Always test the bot thoroughly using the [Kraken Futures Demo](https://demo-futures.kraken.com/) before considering its use with real money.

- **Use at Your Own Risk**: The bot is provided "as is" without any warranties. Use it at your own risk and discretion.

## Getting Started

To get started with the KrakenFutures_DCA_BOT, follow the instructions

---

1. Amend the `.env` file to enter your api keys for demo or real
   \*\* Modify the dca-bot.js changing in the apiInstance API_KEY_DEMO & API_SECRET_DEMO to API_KEY & API_SECRET
2. Install the example dependencies with `$npm install`
3. Run the application with `$node dca-bot.js` after you check the script actions
4. Follow in the Kraken Futures platform your position.

## Functionality Overview

# MAIN FUNCTION also called BOT CYCLE

- When executed, first opens a market position, incluiding a takeProfit separated by 1%,
- and 3 limitOrders separated by 1% between them.
-
- The code checks every 1 minute if the limitOrders are filled, if so, the takeProfit order
- is updated acordenly to be separated to 1% of the entry price.
-
- The code checks every 1 minute if the takeProfit is filled, if so, all the remainig orders
- will be closed, and the botcycle will be restarted.
