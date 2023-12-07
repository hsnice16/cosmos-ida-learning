import { IndexedTx, StargateClient } from "@cosmjs/stargate"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"

const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"

const runAll = async (): Promise<void> => {
    const client = await StargateClient.connect(rpc)
    console.log("With client, chain id:", await client.getChainId(), ", height:", await client.getHeight())

    console.log(
        "Alice balances:",
        await client.getAllBalances("cosmos1jgqh7vfj88wedyt572zappaqn9c02kpjt5e3lf")
    )

    const faucetTx: IndexedTx = (await client.getTx(
        "2B80CF6C1192AC3716E3BAF5B3C82396023BDA33C37ED2D6E96A4EC4147C91BB"
    ))!
    console.log("Faucet tx:", faucetTx)

    const decodedTx: Tx = Tx.decode(faucetTx.tx)
    console.log("DecodedTx:", decodedTx)
    console.log("Decoded messages:", decodedTx.body!.messages)

    const sendMessage: MsgSend = MsgSend.decode(decodedTx.body!.messages[0].value)
    console.log("Sent message:", sendMessage)

    const faucet: string = sendMessage.fromAddress
    console.log("Faucet balances:", await client.getAllBalances(faucet))
}

runAll()
