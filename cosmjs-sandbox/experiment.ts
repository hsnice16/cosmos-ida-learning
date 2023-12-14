import { readFile } from "fs/promises"
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { IndexedTx, SigningStargateClient, StargateClient } from "@cosmjs/stargate"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"

const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"

const getAliceSignerFromMnemonic = async (): Promise<OfflineDirectSigner> => {
    return DirectSecp256k1HdWallet.fromMnemonic((await readFile("./testnet.alice.mnemonic.key")).toString(), {
        prefix: "cosmos",
    })
}

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

    const aliceSigner = await getAliceSignerFromMnemonic()
    const alice = (await aliceSigner.getAccounts())[0].address
    console.log("Alice's address from signer", alice)

    const signingClient = await SigningStargateClient.connectWithSigner(rpc, aliceSigner)
    console.log(
        "With signing client, chain id:",
        await signingClient.getChainId(),
        ", height:",
        await signingClient.getHeight()
    )

    console.log("Gas fee:", decodedTx.authInfo!.fee!.amount)
    console.log("Gas limit:", decodedTx.authInfo!.fee!.gasLimit.toString(10))

    // Check the balance of Alice and the Faucet
    console.log("Alice balance before:", await client.getAllBalances(alice))
    console.log("Faucet balance before:", await client.getAllBalances(faucet))

    // Execute the sendTokens Tx and store the result
    // Way 1
    // const result = await signingClient.sendTokens(alice, faucet, [{ denom: "uatom", amount: "100000" }], {
    //     amount: [{ denom: "uatom", amount: "1000" }],
    //     gas: "200000",
    // })

    // Way 2
    const result = await signingClient.signAndBroadcast(
        alice,
        [
            {
                typeUrl: "/cosmos.bank.v1beta1.MsgSend",
                value: {
                    fromAddress: alice,
                    toAddress: faucet,
                    amount: [
                        {
                            denom: "uatom",
                            amount: "100000",
                        },
                    ],
                },
            },
        ],
        {
            amount: [{ denom: "uatom", amount: "500" }],
            gas: "200000",
        }
    )

    // Output the result of the Tx
    console.log("Transfer result:", result)
    console.log("Alice balance after:", await client.getAllBalances(alice))
    console.log("Faucet balance after:", await client.getAllBalances(faucet))
}

runAll()
