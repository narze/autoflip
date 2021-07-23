import { AccessToken, RefreshingAuthProvider } from "@twurple/auth"
import { ChatClient } from "@twurple/chat"
import { promises as fs } from "fs"
import dotenv from "dotenv-flow"

dotenv.config({
  default_node_env: "development",
})

const flipIntervalMs = 180 * 1000
const stopTime = 2 * 60 * 60 * 1000
let running = true

const clientId = process.env.CLIENT_ID as string
const clientSecret = process.env.CLIENT_SECRET as string
const channel = process.env.CHANNEL as string

async function main() {
  setTimeout(() => {
    console.log("Stopped")
    running = false
  }, stopTime)

  const tokenData = JSON.parse(await fs.readFile("./tokens.json", "utf-8"))
  const auth = new RefreshingAuthProvider(
    {
      clientId,
      clientSecret,
      onRefresh: async (newTokenData: AccessToken) =>
        await fs.writeFile(
          "./tokens.json",
          JSON.stringify(newTokenData, null, 2),
          "utf-8"
        ),
    },
    tokenData
  )

  const chatClient = new ChatClient(auth, { channels: [channel] })

  let amount: number | string = 1

  async function run() {
    if (!running) {
      return
    }

    const side = Math.random() > 0.5 ? "h" : "t"

    const message = `!flip ${side} ${amount}`
    await chatClient.say(channel, message).then(
      () => {
        console.log("Sent", { message })
      },
      (reason: string) => {
        console.error("Not sent", { reason })
      }
    )

    // Swap amount to prevent duplicated message
    if (amount == 1) {
      // amount = "" // Remove the link for now
      amount = "1 (github.com/narze/autoflip)"
    } else {
      amount = 1
    }
  }

  chatClient.onConnect(async () => {
    console.log("CONNECTED", { channel })

    setInterval(run, flipIntervalMs)
  })

  await chatClient.connect()

  // Run once on start
  run()
}

main()
