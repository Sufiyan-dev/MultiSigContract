pragma solidity ^0.8.0; // SPDX-License-Identifier: UNLICENSED
import 'hardhat/console.sol';
import './accessRegistry.sol';

contract multiSig is accessRegistry{

    event Deposit (address indexed sender, uint amount, uint Contractbalance);
    event SubmitTransaction(
        address indexed owner,
        uint indexed txIndex,
        address indexed to,
        uint value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint indexed txIndex);

    uint8 percentageOfConfirmationNeeded = 60; 

    struct Transaction {
        address payable to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;
    }

    // mapping from tx index => owner => bool
    mapping(uint => mapping(address => bool)) public isConfirmed;

    Transaction[] public transactions;

     modifier txExists(uint _txIndex) {
        require(_txIndex < transactions.length, "tx does not exist");
        _;
    }

    modifier notExecuted(uint _txIndex) {
        require(!transactions[_txIndex].executed, "tx already executed");
        _;
    }

    modifier notConfirmed(uint _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "tx already confirmed by caller");
        _;
    }

    constructor(address[] memory newPartners) {
        
        require(newPartners.length > 0,"owner required");
        
        for(uint i = 0; i < newPartners.length; i++){
            
            address partner = newPartners[i];
            
             require(partner != address(0),"invalid address");
             require(!isPartnerOrNot(partner),"not an  unique partner");
             
             isPartner[partner] = true;
             
             emit newPartner(partner);
             
             partners.push(partner);
             
        }
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function submitTransaction(
        address payable _to,
        uint _value,
        bytes memory _data
    ) public onlyPartners hasNotPaused {
        require(_to != address(0),"invalid address");
        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    function confirmTransaction(uint _txIndex)
        public
        onlyPartners
        hasNotPaused
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    function revokeConfirmation(uint _txIndex)
        public
        onlyPartners
        hasNotPaused
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(isConfirmed[_txIndex][msg.sender], "tx not confirmed by caller");

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    /**
     * @dev to execute transaction 
     */
    function executeTransaction(uint _txIndex)
        public
        onlyPartners
        hasNotPaused
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            calculateConfirmationLeft(_txIndex) == 0,
            "did'nt reached the desire confirmation to execute"
        );
        require(address(this).balance >= transaction.value,"insufficient balance in contract");

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "tx failed");

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    /**
     * @dev to calculate no of confirmation needed
     */
     function calculateConfirmationLeft(uint _txIndex)
      view
      public
      onlyPartners
      hasNotPaused
      txExists(_txIndex) 
      returns(uint){

          Transaction storage transaction = transactions[_txIndex];
          uint confirmationRequired = (partners.length * percentageOfConfirmationNeeded) / 100;
          if(transaction.numConfirmations == 0){
            return confirmationRequired;
          }
          else if(transaction.numConfirmations >= confirmationRequired){
              return 0;
          }else {
              return confirmationRequired - transaction.numConfirmations;
          }
     }

    function getPartners() public view returns (address[] memory) {
        return partners;
    }

    function getTransactionCount() public view returns (uint) {
        require(transactions.length >0 ,"no transaction yet");
        return transactions.length;
    }

     function getTransaction(uint _txIndex)
        public
        view
        returns (
            address to,
            uint value,
            bytes memory data,
            bool executed,
            uint numConfirmations
        )
    {
        require(transactions.length >= 1,"no transaction yet");
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
}