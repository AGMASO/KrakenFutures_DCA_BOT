//Node.js modules
const cf = require("./cfRestApiV3");
const ws = require("./webSocketV1"); //Import of Websocket connection
require("dotenv").config();

//Constants Variables
const BASE_URL_DEMO = "https://demo-futures.kraken.com/"; //Demo API URL
const BASE_URL_REAL = "https://futures.kraken.com/"; //RealMoney API URL
const BASE_URL_WEBSOCKET = "wss://demo-futures.kraken.com/ws/v1"; //Url for Websocket
const REQUEST_TIMEOUT = 15000;
let cycleCounter = 0;

// API access variables DEMO
const API_KEY_DEMO = process.env.API_KEY_DEMO;
const API_SECRET_DEMO = process.env.API_SECRET_DEMO;

// API access variables REAL
const API_KEY = process.env.API_SECRET;
const API_SECRET = process.env.API_SECRET;

//Instance of REST_API_v3 futures Kraken
const apiInstance = new cf.CfRestApiV3(
  BASE_URL_DEMO,
  API_KEY_DEMO,
  API_SECRET_DEMO,
  REQUEST_TIMEOUT
);

//Instance of websocket conecction
/*const wsInstance = new ws.CfWebSocketMethods(
  BASE_URL_WEBSOCKET,
  API_KEY_DEMO,
  API_SECRET_DEMO,
  timeout,
  TRACE
);*/

//!DATA FOR ORDERS
const symbol = "PF_XBTUSD";
const orderType = ["lmt", "mkt", "stp", "take_profit", "trailing_stop"];
const side = ["buy", "sell"];
/**
 * !Adjust size of the market Order
 * !Adjust number of LimitOrders to open
 * !Adjust increment of size for the limitOrders
 * !Adjust separation between limitOrders in %
 * !Adjust separtion of the takeProfit order in %
 */
const size = 0.015;
const numberOfLimitOrders = 5;
const incrementOfSize = 0.005;
const additionalIncrementOfSize = 0.002;
const separationLimitOrders = 0.99; // 1% = 0.99
const separationTakeProfit = 1.012; // 1.2% = 1.012
let limitPrice = null;
let clientId = "my_client_id";
let triggerSignal = "mark";
let intervalId;

/**
 * MAIN FUNCTION also called BOT CYCLE
 *
 * When executed, first opens a market position, incluiding a takeProfit separated by 1%,
 * and 3 limitOrders separated by 1% between them.
 *
 * The code checks every 1 minute if the limitOrders are filled, if so, the takeProfit order
 * is updated acordenly to be separated to 1% of the entry price.
 *
 * The code checks every 1 minute if the takeProfit is filled, if so, all the remainig orders
 * will be closed, and the botcycle will be restarted.
 */
async function main() {
  //Market Order
  const marketOrderPromise = await apiInstance.sendOrder(
    orderType[1],
    symbol,
    side[0],
    size,
    limitPrice,
    (clientOrderId = clientId)
  );

  //console.log(marketOrderPromise.body);

  //GET data from first open position aka marketOrder
  const getOpenPositions = await apiInstance.getOpenPositions();
  const responseBody = JSON.parse(getOpenPositions.body);

  //Iterate throug the postions opened
  for (const position of responseBody.openPositions) {
    console.log(
      `Symbol: ${position.symbol}, Price: ${position.price}, Size ${position.size}`
    );

    //GET important data from open position
    const mainBotPrice = position.price;
    let sizeOpenPosition = position.size;
    let desiredSeparationBtwLimitOrders = Math.round(
      mainBotPrice * separationLimitOrders
    );
    let stopPrice = Math.round(mainBotPrice * separationTakeProfit);
    let limitPrice = null;
    let reduceOnly = true;
    let takeProfitId = "takeProfitCycle"; //Unique Id for takeProfitOrder

    //Creating TakeProfit Order
    let sendTakeProfit = await apiInstance.sendOrder(
      orderType[3],
      symbol,
      side[1],
      size,
      limitPrice,
      stopPrice,
      reduceOnly,
      (clientOrderId = takeProfitId)
    );

    if (sendTakeProfit.body) {
      console.log(`TakeProfit placed successfully`);
    }

    //Loop For to create desired number of limit orders
    let sizeIncrementing = size + incrementOfSize;

    for (let i = 0; i < numberOfLimitOrders; i++) {
      let clientID = `${i}`;
      let sendOrderLimit = await apiInstance.sendOrder(
        orderType[0],
        symbol,
        side[0],
        sizeIncrementing,
        desiredSeparationBtwLimitOrders,
        (clientOrderId = clientID)
      );

      console.log(
        `Limit Order number ${i + 1} PLACED, with a Size of ${sizeIncrementing}`
      );

      desiredSeparationBtwLimitOrders = Math.round(
        desiredSeparationBtwLimitOrders * 0.99
      );
      sizeIncrementing = parseFloat(
        (sizeIncrementing + additionalIncrementOfSize).toFixed(3)
      );
    }

    /**
     * INTERVAL
     *
     * Here we check ,creating few request to the APIv3 Kraken Futures, if either
     * some of the limit orders created are filled. If so adjust the takeProfit
     * to be separated to a 1.2%.
     *
     * The other option is that the takeProfit order is filled, in this case, we start
     * a new bot cycle and increment by one the cycleCounter.
     */

    const intervalFunction = async () => {
      try {
        //Get the Open Orders and check if a takeProfit order with ID take_profit exists
        let openOrdersPromise = await apiInstance.getOpenOrders();
        const responseOpenOrders = JSON.parse(openOrdersPromise.body);
        let takeProfitExist;
        for (const order of responseOpenOrders.openOrders) {
          order.orderType == "take_profit"
            ? (takeProfitExist = true)
            : (takeProfitExist = false);
        }

        //Iterate throug the postions opened
        let openPositionsPromise = await apiInstance.getOpenPositions();
        const responseBody = JSON.parse(openPositionsPromise.body);

        //Check if there are some open position
        if (responseBody.openPositions.length > 0) {
          for (const position of responseBody.openPositions) {
            let newMainBotPrice = position.price;
            let stopPrice = Math.round(newMainBotPrice * 1.01);
            limitPrice = stopPrice - 10;
            console.log(position);
            console.log(
              `Symbol: ${position.symbol}, Price: ${newMainBotPrice}, Size ${position.size}`
            );

            console.log(
              "The size of the First order openend of the cycle" +
                sizeOpenPosition
            );

            console.log(`You are in the BotCycle: ${cycleCounter}`);
            if (position.size > sizeOpenPosition && takeProfitExist) {
              edit = {
                cliOrdId: "takeProfitCycle",
                size: position.size,
                limitPrice,
                stopPrice,
              };
              let editOrderPromise = await apiInstance.editOrder(edit);
              //console.log(editOrderPromise);
              //Update the new position.size
              sizeOpenPosition = position.size;
              console.log("Take Profit Updated");
            }
          }
        } else {
          //Get the orders filled, and check if the lastorder filled is equal to unique ID
          //"takeProfitCycle".
          let getFills = await apiInstance.getFills();
          const responseWithFills = JSON.parse(getFills.body);
          let lastOrderId = responseWithFills.fills[0].cliOrdId;

          if (lastOrderId === "takeProfitCycle") {
            console.log("Take Profit Executed. Restarting Cycle...");
            await apiInstance.cancelAllOrders("PF_XBTUSD");
            clearInterval(intervalId); // Stop the current interval
            cycleCounter++; //Increment by one the cycleBot
            main();
          } else {
            console.log("No open positions found.");
            console.log("Manually closed");
            await apiInstance.cancelAllOrders("PF_XBTUSD");
            console.log("All the reamining Orders cancelled");
            console.log("Start the bot manually");
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error("Error in interval:", error);

        if (
          error.code === "ENOTFOUND" ||
          error.code === "ESOCKETTIMEDOUT" ||
          error.code === "ETIMEDOUT"
        ) {
          console.log("Retrying interval after DNS resolution failure.");

          clearInterval(intervalId);
          intervalId = setInterval(intervalFunction, 60000);
        } else {
          console.error("Unexpected error. Terminating interval.");
        }
      }
    };
    intervalId = setInterval(intervalFunction, 60000);
  }
}

try {
  main();
} catch (err) {
  console.error("received " + err);
}
