const WebSocket = require("ws");
const crypto = require("crypto");

class CfWebSocketMethods {
  constructor(
    baseUrlWebSocket,
    api_key = "",
    api_secret = "",
    timeout = 10,
    trace = false
  ) {
    this.baseUrlWebSocket = baseUrlWebSocket;
    this.api_key = api_key;
    this.api_secret = api_secret;
    this.timeout = timeout;
    this.trace = trace;

    this.ws = null;
    this.original_challenge = null;
    this.signed_challenge = null;
    this.challenge_ready = false;
  }

  subscribePublic(feed, product_ids = null) {
    const requestMessage = product_ids
      ? { event: "subscribe", feed, product_ids }
      : { event: "subscribe", feed };

    console.log(`public subscribe to ${feed}`);

    const requestJson = JSON.stringify(requestMessage);
    this.ws.send(requestJson);
  }

  unsubscribePublic(feed, product_ids = null) {
    const requestMessage = product_ids
      ? { event: "unsubscribe", feed, product_ids }
      : { event: "unsubscribe", feed };

    console.log(`public unsubscribe to ${feed}`);
    const requestJson = JSON.stringify(requestMessage);
    this.ws.send(requestJson);
  }

  subscribePrivate(feed) {
    if (!this.challenge_ready) {
      this.waitforChallengeAuth();
    }

    const requestMessage = {
      event: "subscribe",
      feed,
      api_key: this.api_key,
      original_challenge: this.original_challenge,
      signed_challenge: this.signed_challenge,
    };

    console.log(`private subscribe to ${feed}`);

    const requestJson = JSON.stringify(requestMessage);
    this.ws.send(requestJson);
  }

  unsubscribePrivate(feed) {
    if (!this.challenge_ready) {
      this.waitforChallengeAuth();
    }

    const requestMessage = {
      event: "unsubscribe",
      feed,
      api_key: this.api_key,
      original_challenge: this.original_challenge,
      signed_challenge: this.signed_challenge,
    };

    console.log(`private unsubscribe to ${feed}`);
    const requestJson = JSON.stringify(requestMessage);
    this.ws.send(requestJson);
  }

  connect() {
    console.log(this.baseUrlWebSocket);
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.baseUrlWebSocket, {
        perMessageDeflate: false,
      });

      this.ws.on("open", () => {
        console.log(`Connected to ${this.baseUrlWebSocket}`);
        resolve(); // Resolve the promise when the connection is open.
      });

      this.ws.on("message", (message) => {
        this.onMessage(message);
      });

      this.ws.on("close", () => {
        console.log("Connection closed");
      });

      this.ws.on("error", (error) => {
        console.log(error);
        reject(error); // Reject the promise if there is an error during the connection.
      });
    });
  }

  onMessage(message) {
    const messageJson = JSON.parse(message);
    console.log(messageJson);

    if (messageJson.event === "challenge") {
      this.original_challenge = messageJson.message;
      this.signed_challenge = this.signChallenge(this.original_challenge);
      this.challenge_ready = true;
    }
    if (messageJson.feed === "open_orders") {
      const order = messageJson.orders;
      if (
        order &&
        order.type === "limit" &&
        messageJson.reason === "full_fill"
      ) {
        // Update take profit or perform any other necessary action
        console.log(
          `Limit order ${order.order_id} fully filled. Update take profit.`
        );
      }
    }
  }

  waitforChallengeAuth() {
    return new Promise((resolve) => {
      if (this.challenge_ready) {
        resolve();
      } else {
        this.requestChallenge();

        const checkChallenge = () => {
          if (this.challenge_ready) {
            resolve();
          } else {
            setTimeout(checkChallenge, 1000);
          }
        };
        checkChallenge();
      }
    });
  }

  requestChallenge() {
    const requestMessage = {
      event: "challenge",
      api_key: this.api_key,
    };

    const requestJson = JSON.stringify(requestMessage);
    this.ws.send(requestJson);
  }

  signChallenge(challenge) {
    const sha256_hash = crypto.createHash("sha256");
    sha256_hash.update(challenge, "utf8");
    const hash_digest = sha256_hash.digest();

    const secret_decoded = Buffer.from(this.api_secret, "base64");
    const hmac_digest = crypto
      .createHmac("sha512", secret_decoded)
      .update(hash_digest)
      .digest();

    const sch = hmac_digest.toString("base64");
    return sch;
  }
}

function sleep(seconds) {
  const ms = seconds * 1000;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

module.exports = {
  CfWebSocketMethods,
};
