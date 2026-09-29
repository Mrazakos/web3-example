const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CampusPitches Smart Contract", function () {
  let CampusPitches;
  let campusPitches;
  let owner, student1, student2, professor;

  beforeEach(async function () {
    [owner, student1, student2, professor] = await ethers.getSigners();

    const CampusPitchesFactory = await ethers.getContractFactory("CampusPitches");
    campusPitches = await CampusPitchesFactory.deploy();
    await campusPitches.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should start with 0 pitches", async function () {
      expect(await campusPitches.pitchCount()).to.equal(0);
    });

    it("Should return an empty array for getAllPitches", async function () {
      const all = await campusPitches.getAllPitches();
      expect(all.length).to.equal(0);
    });
  });

  describe("Pitch Creation", function () {
    it("Should allow a student to submit a new pitch and emit PitchCreated", async function () {
      await expect(
        campusPitches.connect(student1).createPitch(
          "Autonomous Campus Shuttle",
          "An EV shuttle navigating using computer vision.",
          "Robotics"
        )
      )
        .to.emit(campusPitches, "PitchCreated")
        .withArgs(1, student1.address, "Autonomous Campus Shuttle", "Robotics");

      expect(await campusPitches.pitchCount()).to.equal(1);

      const pitch = await campusPitches.pitches(1);
      expect(pitch.id).to.equal(1);
      expect(pitch.author).to.equal(student1.address);
      expect(pitch.title).to.equal("Autonomous Campus Shuttle");
      expect(pitch.category).to.equal("Robotics");
      expect(pitch.voteCount).to.equal(0);
      expect(pitch.totalFunds).to.equal(0);
    });

    it("Should revert if title is empty", async function () {
      await expect(
        campusPitches.connect(student1).createPitch("", "No title description", "General")
      ).to.be.revertedWithCustomError(campusPitches, "EmptyTitle");
    });
  });

  describe("Voting (1 Vote per Wallet)", function () {
    beforeEach(async function () {
      await campusPitches.connect(student1).createPitch(
        "AI Study Notes Generator",
        "Summarizes lectures automatically.",
        "AI"
      );
    });

    it("Should allow a user to vote and increment voteCount", async function () {
      await expect(campusPitches.connect(student2).vote(1))
        .to.emit(campusPitches, "Voted")
        .withArgs(1, student2.address, 1);

      const pitch = await campusPitches.pitches(1);
      expect(pitch.voteCount).to.equal(1);
      expect(await campusPitches.checkIfVoted(1, student2.address)).to.be.true;
    });

    it("Should prevent the same wallet from voting twice", async function () {
      await campusPitches.connect(student2).vote(1);

      await expect(
        campusPitches.connect(student2).vote(1)
      ).to.be.revertedWithCustomError(campusPitches, "AlreadyVoted");
    });

    it("Should allow multiple distinct addresses to vote", async function () {
      await campusPitches.connect(student2).vote(1);
      await campusPitches.connect(professor).vote(1);
      await campusPitches.connect(owner).vote(1);

      const pitch = await campusPitches.pitches(1);
      expect(pitch.voteCount).to.equal(3);
    });

    it("Should revert if voting for non-existent pitch", async function () {
      await expect(
        campusPitches.connect(student2).vote(999)
      ).to.be.revertedWithCustomError(campusPitches, "PitchDoesNotExist");
    });
  });

  describe("Micro-Grants & Tipping (Native ETH Value Transfer)", function () {
    beforeEach(async function () {
      await campusPitches.connect(student1).createPitch(
        "Campus Bike Sharing System",
        "A decentralized bike rental system.",
        "Green Campus"
      );
    });

    it("Should transfer native ETH directly to the student author and record the tip", async function () {
      const tipAmount = ethers.parseEther("0.5");
      const initialAuthorBalance = await ethers.provider.getBalance(student1.address);

      await expect(
        campusPitches.connect(professor).tipPitch(1, "Incredible idea! Funded from lab budget.", {
          value: tipAmount,
        })
      )
        .to.emit(campusPitches, "PitchFunded")
        .withArgs(1, professor.address, tipAmount, "Incredible idea! Funded from lab budget.");

      // Check author balance increased by tip amount
      const finalAuthorBalance = await ethers.provider.getBalance(student1.address);
      expect(finalAuthorBalance - initialAuthorBalance).to.equal(tipAmount);

      // Check contract state records
      const pitch = await campusPitches.pitches(1);
      expect(pitch.totalFunds).to.equal(tipAmount);

      const tips = await campusPitches.getPitchTips(1);
      expect(tips.length).to.equal(1);
      expect(tips[0].sender).to.equal(professor.address);
      expect(tips[0].amount).to.equal(tipAmount);
      expect(tips[0].message).to.equal("Incredible idea! Funded from lab budget.");
    });

    it("Should revert if tip amount is zero", async function () {
      await expect(
        campusPitches.connect(professor).tipPitch(1, "Zero tip", { value: 0 })
      ).to.be.revertedWithCustomError(campusPitches, "CannotTipZero");
    });

    it("Should revert when tipping a non-existent pitch", async function () {
      await expect(
        campusPitches.connect(professor).tipPitch(42, "Ghost project", {
          value: ethers.parseEther("0.1"),
        })
      ).to.be.revertedWithCustomError(campusPitches, "PitchDoesNotExist");
    });
  });
});
