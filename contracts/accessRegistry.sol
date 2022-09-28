pragma solidity ^0.8.0; //SPDX-License-Identifier: UNLICENSED
import 'hardhat/console.sol';
/**
 *    Here owner refers to `Owner` refers to owner of the contract.
 *    & `Partner` refers to new member of multi sig wallet.
 */
contract accessRegistry {

    address owner; // 20 bytes
    bool isPausedForAll; // 1 bytes
    mapping(address => bool) isPartner;
    address[] partners;


    // event for announcing new contract owner
    event ContractOwnerChange(address indexed currentOwner,address indexed newOwner);

    // event for announcing new partner
    event newPartner(address indexed newPartner);

    // event for removing partner
    event removedPartner(address indexed partnerAddress);

    /**
     * @dev assigning deployers address to owner
     */
    constructor () {
        owner = msg.sender; 
        isPartner[owner] = true; 
        partners.push(owner);
    }

    // to check address is owner or not
    modifier onlyContractOwner() {
        require(msg.sender == owner,"only owner can access this function !");
        _;
    }

    // to check address is partner or not
    modifier onlyPartners() {
        require(isPartner[msg.sender],"caller is not an partner !!");
        _;
    }

    // to check that owner has paused or not
    modifier hasNotPaused() {
        require(!isPausedForAll,"owner has paused the access");
        _;
    }


    /**
     * @dev to get the current owner
     */
     function getContractOwner() public view returns(address){
         return owner;
     }

    /**
     * @dev to check address is partner or not
     * @param user to check
     */
     function isPartnerOrNot(address user) public view returns(bool){
         require(user != address(0),"invalid address");
         return isPartner[user];
     }

     /**
      * @dev to assign new owner
      * @param newOwner address of new owner
      */
     function setContractOwner(address newOwner) external onlyContractOwner {
         require(newOwner != address(0),"invalid address");
         emit ContractOwnerChange(msg.sender, newOwner);
         owner = newOwner;
     }

     /**
      * @dev to approve the address to be the one of the owners
      * @param partnerAddress address of approving to be the part
      */
      function addNewPartner(address partnerAddress) external onlyContractOwner {
          require(partnerAddress != address(0),"invalid address");
          require(!isPartnerOrNot(partnerAddress), "is already an partner");
          emit newPartner(partnerAddress);
          partners.push(partnerAddress);
          isPartner[partnerAddress] = true;
      }

       /**
        * @dev to pause access of partners
        */
        function pauseAllPartners() external onlyContractOwner {
            isPausedForAll = true;
        }

        /**
         * @dev to unpause access of partners
         */
         function unpauseAllPartners() external onlyContractOwner {
             isPausedForAll = false;
         }
}