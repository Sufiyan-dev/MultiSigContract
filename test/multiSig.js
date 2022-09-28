const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSig",() => {
   // We define a fixture to reuse the same setup in every test.
   // We use loadFixture to run this setup once, snapshot that state,
   // and reset Hardhat Network to that snapshopt in every test.
   async function deployContractFixture() {
      const [addr1, addr2, addr3, addr4, addr5, addr6, addr7] = await ethers.getSigners();

      const contract = await ethers.getContractFactory('multiSig');
      const multiSig = await contract.deploy([addr2.address,addr3.address]);

      return {multiSig, addr1, addr2, addr3, addr4, addr5, addr6, addr7}
   }

   describe("deploy", () => {
      describe("validation", () => {
         it("should set the right owner", async () => {
            const { multiSig, addr1, addr2 } = await loadFixture(deployContractFixture);
    
            expect(await multiSig.getContractOwner()).to.be.equal(addr1.address);
    
         });
         it("should add other parthers of constructor para", async () => {
            const { multiSig, addr1, addr2, addr3} = await loadFixture(deployContractFixture);
    
            expect(await multiSig.isPartnerOrNot(addr2.address)).to.be.true;
            expect(await multiSig.isPartnerOrNot(addr3.address)).to.be.true;
         });
         it("should not have any transaction", async () => {
            const { multiSig, addr1, addr2, addr3} = await loadFixture(deployContractFixture);
    
            await expect(multiSig.getTransactionCount()).to.be.revertedWith("no transaction yet")
         });
      })
   });
   describe("add partners", () => {
      describe("validation", () => {
         it("should only allow owner to add new partners", async () => {
            const { multiSig, addr1, addr2, addr3, addr4} = await loadFixture(deployContractFixture);
    
            await expect(multiSig.connect(addr2).addNewPartner(addr4.address)).to.be.revertedWith("only owner can access this function !");
         });
      })
      describe("event", () => {
         it("should emit event when new partner gets added", async () => {
            const { multiSig, addr1, addr2, addr3, addr4} = await loadFixture(deployContractFixture);

            await expect(multiSig.addNewPartner(addr4.address))
            .to.emit(multiSig,"newPartner")
            .withArgs(addr4.address);
         })
      })
   });
   describe("change ownership", () => {
      describe("validation", () => {
         it("should allow owner of contract to transfer ownership", async () => {
            const { multiSig, addr1, addr2} = await loadFixture(deployContractFixture);
   
            await expect(multiSig.connect(addr2).setContractOwner(addr2.address)).to.be.revertedWith("only owner can access this function !");
         })
         it("should not transfer ownership to zero address", async () => {
            const { multiSig, addr1, addr2} = await loadFixture(deployContractFixture);
   
            await expect(multiSig.setContractOwner(ethers.constants.AddressZero)).to.be.revertedWith("invalid address");
         })
         it("should transfer owner to the correct address", async () => {
            const { multiSig, addr1, addr2} = await loadFixture(deployContractFixture);

            const transferOwnership = await multiSig.setContractOwner(addr2.address);

            expect(await multiSig.getContractOwner()).to.be.equal(addr2.address);
            
         })
      })
      describe("event", () => {
         it("should emit event if transfer ownership succesfully", async () => {
            const { multiSig, addr1, addr2} = await loadFixture(deployContractFixture);

            await expect(multiSig.connect(addr1).setContractOwner(addr2.address))
            .to.emit(multiSig,"ContractOwnerChange")
            .withArgs(addr1.address,addr2.address);
         })
      })
   })
   describe("pause and unpause functions", () => {
      describe("validation", () => {
         it("should only allow owner to pause and unpause the access of partners", async () => {
            const { multiSig, addr1, addr2, addr3} = await loadFixture(deployContractFixture);
    
            await expect(multiSig.connect(addr2).pauseAllPartners()).to.be.revertedWith("only owner can access this function !");
            await expect(multiSig.connect(addr2).unpauseAllPartners()).to.be.revertedWith("only owner can access this function !");
         });
         it("should not allow any parther to access function until owner will unpause it", async () => {
            const {multiSig, addr1, addr2, addr3, addr4} = await loadFixture(deployContractFixture);
    
            const pausePartner = await multiSig.pauseAllPartners();
            pausePartner.wait();
    
            await expect(multiSig.submitTransaction(addr4.address,1000,"0x00")).to.be.revertedWith("owner has paused the access");

            const unpuasePartner = await multiSig.unpauseAllPartners();
            unpuasePartner.wait();
         });
      })
   })
   describe("receive function to accept ETH", () => {
      describe("validation", () => {
         it("should accept raw eth from users", async () => {
            const {multiSig, addr1} = await loadFixture(deployContractFixture);
            expect(await ethers.provider.getBalance(multiSig.address)).to.be.equal(0);
            const sendETH = await addr1.sendTransaction({
               to: multiSig.address,
               value: ethers.utils.parseEther("1.0")
            });
            sendETH.wait();
   
            expect(await ethers.provider.getBalance(multiSig.address)).to.be.equal(ethers.utils.parseEther("1.0"));
         });
      })
   })
   describe("make transaction", () => {
      describe("validation", () => {
         it("should only allow partners to access function", async () => {
            const { multiSig, addr1, addr2, addr3, addr4} = await loadFixture(deployContractFixture);
    
            await expect(multiSig.connect(addr4).submitTransaction(addr1.address, 1000, "0x00")).to.be.revertedWith("caller is not an partner !!");
          });
          it("should revert error if `_to` has invalid address", async () => {
            const { multiSig, addr1, addr2, addr3, addr4} = await loadFixture(deployContractFixture);

            await expect(multiSig.submitTransaction(ethers.constants.AddressZero, 1000, "0x00"))
            .to.be.revertedWith("invalid address");
          })
          it("should make succesful transaction", async () => {
            const { multiSig, addr1, addr2, addr3, addr4} = await loadFixture(deployContractFixture);
    
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
    
            expect(await multiSig.getTransactionCount()).to.be.equal(1);
            
          });
          it("should not have any confirmation", async () => {
            const { multiSig, addr1, addr2, addr3, addr4} = await loadFixture(deployContractFixture);
    
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
    
            expect(await multiSig.calculateConfirmationLeft(0)).to.be.equal(1);
          })
      })
      describe("event", () => {
         it("should emit an event when new transaction get created", async () => {
            const {multiSig, addr1, addr2} = await loadFixture(deployContractFixture);

            await expect(multiSig.submitTransaction(addr2.address, ethers.utils.parseEther("1.0"), "0x00"))
            .to.emit(multiSig,"SubmitTransaction")
            .withArgs(addr1.address, 0, addr2.address, ethers.utils.parseEther("1.0"), "0x00");
         })
      })
   })
   describe("confirm transaction", () => {
      describe("validation", () => {
         it("should only allow patners to confirm the transaction", async () => {
            const { multiSig, addr1, addr2, addr3, addr4} =await loadFixture(deployContractFixture);
   
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
   
            await expect(multiSig.connect(addr4).confirmTransaction(0)).to.be.revertedWith("caller is not an partner !!");
         });
         it("should have a valid transaction id", async () => {
            const { multiSig, addr1, addr2, addr3, addr4} = await loadFixture(deployContractFixture);
   
            await expect(multiSig.confirmTransaction(0)).to.be.revertedWith("tx does not exist");
         });
         it("should only allow to confirm tx when it's not executed", async () => {
            const {multiSig, addr1, addr2, addr4, addr5} = await loadFixture(deployContractFixture);
   
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
   
            const confirmTx = await multiSig.confirmTransaction(0);
            confirmTx.wait();
   
            expect(await multiSig.calculateConfirmationLeft(0)).to.be.equal(0);
   
            const sendETH = await addr5.sendTransaction({
               to: multiSig.address,
               value: ethers.utils.parseEther("1.0")
            });
            sendETH.wait();
   
            const executeTx = await multiSig.executeTransaction(0);
            executeTx.wait();
   
            await expect(multiSig.confirmTransaction(0)).to.be.revertedWith("tx already executed");
         });
         it("should only allow one confirmaation per partner", async () => {
            const {multiSig, addr1, addr2, addr4, addr5} = await loadFixture(deployContractFixture);
   
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
   
            const confirmTx = await multiSig.confirmTransaction(0);
            confirmTx.wait();
   
            await expect(multiSig.confirmTransaction(0)).to.be.revertedWith("tx already confirmed by caller");
         })
      })
      describe("event", () => {
         it("should emit event when partern confirm/validate transaction", async () => {
            const {multiSig, addr1, addr2, addr4} = await loadFixture(deployContractFixture);

            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();

            await expect(multiSig.confirmTransaction(0))
            .to.emit(multiSig,"ConfirmTransaction")
            .withArgs(addr1.address, 0)
         })
      })
   });
   describe("revoke tranasaction", () => {
      describe("validation", () => {
         it("should only allow partners to access the function", async () => {
            const { multiSig, addr2, addr4} = await loadFixture(deployContractFixture);

            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();

            expect(multiSig.revokeConfirmation(0)).to.be.revertedWith("caller is not an partner !!")
         })
         it("should only revoke tx if valid tx id is provided", async () => {
            const { multiSig, addr1} = await loadFixture(deployContractFixture);
   
            await expect(multiSig.revokeConfirmation(0)).to.be.revertedWith("tx does not exist")
         })
         it("should only allow to revoke when user/partner have confirm it", async () => {
            const { multiSig, addr1, addr2, addr3, addr4} = await loadFixture(deployContractFixture);
   
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
   
            await expect(multiSig.revokeConfirmation(0)).to.be.revertedWith("tx not confirmed by caller");
         });
         it("should only revoke tx when its not executed yet", async () => {
            const {multiSig, addr1, addr2, addr4, addr5} = await loadFixture(deployContractFixture);
   
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
            
            const confirmTx = await multiSig.confirmTransaction(0);
            confirmTx.wait();
   
            const sendETH = await addr5.sendTransaction({
               to: multiSig.address,
               value: ethers.utils.parseEther("1.0")
            });
            sendETH.wait();
   
            const executeTx = await multiSig.executeTransaction(0);
            executeTx.wait();
   
            await expect(multiSig.revokeConfirmation(0)).to.be.revertedWith("tx already executed")
         });
         it("should not allow partners to access function if owner has pause access", async () => {
            const {multiSig, addr1, addr2, addr4, addr5} = await loadFixture(deployContractFixture);

            const pauseAccess = await multiSig.pauseAllPartners();
            pauseAccess.wait();

            await expect(multiSig.revokeConfirmation(0)).to.be.revertedWith("owner has paused the access");
         })
      });
      describe("event", () => {
         it("should emit event someone.partner revoke transaction", async () => {
            const {multiSig, addr1, addr2, addr4} = await loadFixture(deployContractFixture);

            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
            
            const confirmTx = await multiSig.confirmTransaction(0);
            confirmTx.wait();

            await expect(multiSig.revokeConfirmation(0))
            .to.emit(multiSig,"RevokeConfirmation")
            .withArgs(addr1.address, 0);
         })
      })
   })
   describe("execute transaction", async () => {
      describe("validation", () => {
         it("should revert error if contract does'nt have enought eth to execute tx", async () => {
            const { multiSig, addr1, addr2, addr4} = await loadFixture(deployContractFixture);
            
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
         
            const confirmTx = await multiSig.confirmTransaction(0);
            confirmTx.wait();
         
            expect(await multiSig.calculateConfirmationLeft(0)).to.be.equal(0);
         
            await expect(multiSig.executeTransaction(0)).to.be.revertedWith("insufficient balance in contract");
         });
         it("should only take valid tx id", async () => {
            const { multiSig, addr1, addr2, addr4} = await loadFixture(deployContractFixture);
   
            await expect(multiSig.executeTransaction(0)).to.be.revertedWith("tx does not exist");
         })
         it("should only execute tx when its not already executed", async () => {
            const { multiSig, addr1, addr2, addr4, addr5} = await loadFixture(deployContractFixture);
   
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
            
            const confirmTx = await multiSig.confirmTransaction(0);
            confirmTx.wait();
   
            const sendETH = await addr5.sendTransaction({
               to: multiSig.address,
               value: ethers.utils.parseEther("1.0")
            });
            sendETH.wait();
   
            const executeTx = await multiSig.executeTransaction(0);
            executeTx.wait();
   
            await expect(multiSig.executeTransaction(0)).to.be.revertedWith("tx already executed");
         })
         it("should only execute tx when desired amount of partners have confirme it", async () => {
            const {multiSig, addr2, addr4} = await loadFixture(deployContractFixture);
   
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
   
            await expect(multiSig.executeTransaction(0)).to.be.revertedWith("did'nt reached the desire confirmation to execute");
   
         })
         it("should succesfully execute tx when requirement meets", async () => {
            const {multiSig, addr2, addr4, addr5} = await loadFixture(deployContractFixture);
   
            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
   
            const confirmTx = await multiSig.confirmTransaction(0);
            confirmTx.wait();
   
            const sendETH = await addr5.sendTransaction({
               to: multiSig.address,
               value: ethers.utils.parseEther("1.0")
            });
            sendETH.wait();
   
            const executeTx = await multiSig.executeTransaction(0);
            executeTx.wait();
   
            const checkTxDetails = await multiSig.getTransaction(0);
            expect(checkTxDetails[3]).to.be.true;
         })
      });
      describe("event", () => {
         it("should emit event when transaction get executed", async () => {
            const {multiSig, addr1, addr2, addr4, addr5} = await loadFixture(deployContractFixture);

            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr4.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();
   
            const confirmTx = await multiSig.confirmTransaction(0);
            confirmTx.wait();
   
            const sendETH = await addr5.sendTransaction({
               to: multiSig.address,
               value: ethers.utils.parseEther("1.0")
            });
            sendETH.wait();

            expect(await multiSig.executeTransaction(0))
            .to.emit(multiSig,"ExecuteTransaction")
            .withArgs(addr1.address, 0);
         })
      })
   });
   describe("confirmation required", () => {
      describe("validation", () => {
         it("should only return zero when 60% of partners confirm tx", async() => {
            const { multiSig, addr2, addr4, addr5, addr6, addr7} = await loadFixture(deployContractFixture);

            const addpartner4 = await multiSig.addNewPartner(addr4.address);
            addpartner4.wait();

            const addpartner5 = await multiSig.addNewPartner(addr5.address);
            addpartner5.wait();

            const addpartner6 = await multiSig.addNewPartner(addr6.address);
            addpartner6.wait();

            const makeTransaction = await multiSig.connect(addr2).submitTransaction(addr7.address, ethers.utils.parseEther("1.0"), "0x00");
            makeTransaction.wait();

            // 1
            const confirmTx = await multiSig.confirmTransaction(0);
            confirmTx.wait();

            expect(await multiSig.calculateConfirmationLeft(0)).to.be.not.equal(0);
            expect(await multiSig.calculateConfirmationLeft(0)).to.be.not.equal(3);
         })
      })
   })
   describe("get partners", () => {
      describe("validation", () => {
         it("should not return empty array", async () => {
            const {multiSig, addr1} = await loadFixture(deployContractFixture);

            expect(await multiSig.getPartners()).to.not.be.empty;
         })
         it("should return an array of length more than or equal to 3", async () => {
            const {multiSig, addr1} = await loadFixture(deployContractFixture);

            expect(await multiSig.getPartners()).length.be.greaterThanOrEqual(3);
         })
      })
   })
})
