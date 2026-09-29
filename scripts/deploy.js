const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("----------------------------------------------------");
  console.log("🚀 Deploying CampusPitches Smart Contract...");
  console.log("----------------------------------------------------");

  const [deployer, student1, student2, professor] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  const CampusPitches = await hre.ethers.getContractFactory("CampusPitches");
  const campusPitches = await CampusPitches.deploy();
  await campusPitches.waitForDeployment();

  const contractAddress = await campusPitches.getAddress();
  console.log(`✅ CampusPitches deployed to: ${contractAddress}`);

  // Automatically export address & ABI to frontend directory
  const frontendContractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  const contractAddressPath = path.join(frontendContractsDir, "contract-address.json");
  fs.writeFileSync(
    contractAddressPath,
    JSON.stringify({ CampusPitches: contractAddress, chainId: 31337 }, null, 2)
  );

  const artifact = await hre.artifacts.readArtifact("CampusPitches");
  const contractArtifactPath = path.join(frontendContractsDir, "CampusPitches.json");
  fs.writeFileSync(contractArtifactPath, JSON.stringify(artifact, null, 2));

  console.log(`📦 Saved contract address & ABI to: ${frontendContractsDir}`);

  // Seed demo data for the presentation
  console.log("\n🌱 Seeding realistic demo student projects...");

  // Pitch 1: AI Study Assistant
  const tx1 = await campusPitches.connect(student1).createPitch(
    "CampusAI: Exam Study Partner",
    "Open-source local LLM fine-tuned on course syllabi and past exams to quiz students and summarize slides.",
    "Artificial Intelligence"
  );
  await tx1.wait();

  // Pitch 2: Green Campus Bike Share
  const tx2 = await campusPitches.connect(student2).createPitch(
    "Velox: Decentralized Bike Sharing",
    "A dockless smart lock bike fleet operated directly on smart contracts with zero middleman rental markup.",
    "Sustainability"
  );
  await tx2.wait();

  // Pitch 3: Cafeteria Food Rescue
  const tx3 = await campusPitches.connect(deployer).createPitch(
    "ZeroWaste: Cafeteria Surplus Alerts",
    "Real-time notifications when the university dining hall has fresh surplus food at 80% discount.",
    "Social Impact"
  );
  await tx3.wait();

  // Add sample votes
  console.log("🗳️  Casting initial demo votes...");
  await (await campusPitches.connect(student1).vote(2)).wait();
  await (await campusPitches.connect(student2).vote(1)).wait();
  await (await campusPitches.connect(professor).vote(1)).wait();
  await (await campusPitches.connect(professor).vote(2)).wait();
  await (await campusPitches.connect(student1).vote(3)).wait();

  // Add sample micro-grants / tips with messages
  console.log("💸 Sending initial demo micro-grants in ETH...");
  await (
    await campusPitches.connect(professor).tipPitch(1, "Great idea! CS department approves a pilot.", {
      value: hre.ethers.parseEther("0.25"),
    })
  ).wait();

  await (
    await campusPitches.connect(student2).tipPitch(1, "Would love to test this for the midterm!", {
      value: hre.ethers.parseEther("0.05"),
    })
  ).wait();

  await (
    await campusPitches.connect(professor).tipPitch(2, "Excellent sustainability initiative.", {
      value: hre.ethers.parseEther("0.5"),
    })
  ).wait();

  console.log("✨ Seeding complete! 3 sample pitches with votes and tips are ready for the presentation.");
  console.log("----------------------------------------------------\n");
}

main().catch((error) => {
  console.error("Error during deployment:", error);
  process.exitCode = 1;
});
