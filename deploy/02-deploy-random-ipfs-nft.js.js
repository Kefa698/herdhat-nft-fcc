const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokeUriMetadata } = require("../utils/uploadToPinata")

const imagesLocation = "./images/randomNft/"

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100
        }
    ]
}
let tokenUris = [
    "ipfs://Qmaob6xDfEP8BXQcBu3Qq5ZAhrLsBaHWvW8doyhnT9FnpS",
    "ipfs://Qmd5u3XEWMtkkVAwjCdDgKZnRLp3zXXRFgFeKRtbusipGQ",
    "ipfs://Qmc1r6hcCu3EnaGi49LvybMDDXw45ZmziMcNTFD9ojuYRX"
]
const FUND_AMOUNT = "1000000000000000000000"

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUri()
    }

    let vrfCoordinatorV2Address, subscriptionId

    if (developmentChains.includes(network.name)) {
        const vRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vRFCoordinatorV2Mock.address
        const tx = await vRFCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vRFCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vRFCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }
    log("------------------------------------------------------")
    await storeImages(imagesLocation)
    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee
    ]
    const RandomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })
    log("---------------------------------")
    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(RandomIpfsNft.address, args)
    }
}

async function handleTokenUri() {
    tokenUris = []

    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    for (imageUploadResponseIndex in imageUploadResponses) {
        //create metadata
        //upload metadata
        let tokenUriMetadata = { ...metadataTemplate }
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
        storeTokeUriMetadata.description = `an adorable ${tokenUriMetadata.name} pup`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`uploading token uri ${tokenUriMetadata.name}.........`)

        //store the files
        const metadataUploadResponse = await storeTokeUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("token uris uploaded: they are..")
    console.log(tokenUris)

    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]
