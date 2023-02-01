pragma solidity ^0.8.0; // SPDX-License-Identifier: UNLICENSED
import 'hardhat/console.sol';
import './accessRegistry.sol';


interface IERC20 {
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}


contract multiSig is accessRegistry{

    event Deposit (address indexed sender, uint amount, uint Contractbalance);
    event SubmitEthTransaction(
        address indexed owner,
        uint indexed txIndex,
        address indexed to,
        uint value,
        bytes data
    );
    event SubmitTokenTransaction(
        address indexed owner,
        address tokenAddress,
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
        address tokenAddress;
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
        
        require(newPartners.length > 0,"partners required");
        
        for(uint i = 0; i < newPartners.length; i++){
            
            address partner = newPartners[i];
            
             require(partner != address(0),"invalid address");
             require(!isPartnerOrNot(partner),"not an  unique partner");
             
             isPartner[partner] = true;
             
             emit newPartner(partner);
             
             partners.push(partner);
             
        }
    }
    /**
     * To receive eth directly into contract
     */
    receive() external payable { 
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /**
     * 
     * @param _to Send to address
     * @param _value Value in Eth
     * @param _data Any data
     */
    function submitEthTransaction(
        address payable _to,
        uint _value,
        bytes memory _data
    ) public onlyPartners hasNotPaused {
        require(_to != address(0),"invalid address");
        // require(_value < address(this).balance,"insufficient funds");
        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                tokenAddress: address(0),
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitEthTransaction(msg.sender, txIndex, _to, _value, _data);
    }

    /**
     * 
     * @param _to Send to
     * @param _tokenAddress token address of which we need to send
     * @param _value Value of token
     * @param _data any data 
     */
    function submitTokenTransaction(
        address payable _to,
        address _tokenAddress,
        uint _value,
        bytes memory _data
    ) public onlyPartners hasNotPaused {
        require(_to != address(0),"invalid address");
        // require(_value < IERC20(_tokenAddress).allowance(msg.sender,address(this)),"insufficient funds");

        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                tokenAddress: _tokenAddress,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTokenTransaction(msg.sender, _tokenAddress, txIndex, _to, _value, _data);

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
        require(isConfirmed[_txIndex][msg.sender], "tx not confirmed by caller");
        
        Transaction storage transaction = transactions[_txIndex];

        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    
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
        if(transaction.tokenAddress == address(0)){ // which means its an ETH txn
            require(address(this).balance > transaction.value,"insufficient eth balance in contract");

            (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
            require(success, "tx failed");

        } else {
            require(IERC20(transaction.tokenAddress).balanceOf(address(this)) >= transaction.value,"insufficient token balance in contract");

            (bool txn) = IERC20(transaction.tokenAddress).transfer(transaction.to,transaction.value);
            require(txn, "Transfer failed");
        }

        transaction.executed = true;


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