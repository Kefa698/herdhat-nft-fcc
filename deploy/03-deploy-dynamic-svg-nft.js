const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await ethers.getContract("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
    }

    log("__________________________________________")
    const lowSVG = await fs.readFileSync("./images/dynamicNft/frown.svg", { encoding: "utf8" })
    const highSVG = await fs.readFileSync("./images/dynamicNft/happy.svg", { encoding: "utf-8" })

    args = [ethUsdPriceFeedAddress, lowSVG, highSVG]
    const dynamicSVGNft = await deploy("DynamicSvgNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations:network.config.blockConfirmations || 1

    })
     if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
         log("Verifying...")
         await verify(dynamicSVGNft.address, args)
     }
}
module.exports.tags = ["all", "dynamicSVGNft", "main"]
