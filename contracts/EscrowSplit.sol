// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EscrowSplit
 * @dev Contrato corporativo para automatizar split de pagos a artistas y comisiones de productora.
 */
contract EscrowSplit is Ownable, ReentrancyGuard {
    enum DealStatus { None, Funded, Released, Cancelled }

    struct Deal {
        address payable depositor;
        address payable artist;
        uint256 amount;
        uint256 fee;
        DealStatus status;
    }

    mapping(string => Deal) public deals;
    address public corporateWallet;
    uint256 public constant SERVICE_FEE_BPS = 300; // 3% fee (Base 10000)

    event EscrowDeposited(
        string indexed ipfsHash,
        address indexed depositor,
        address indexed artist,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );

    event FundsReleased(
        string indexed ipfsHash,
        address indexed artist,
        uint256 netAmount,
        uint256 feeAmount,
        uint256 timestamp
    );

    event EscrowCancelled(
        string indexed ipfsHash,
        address indexed depositor,
        uint256 amount,
        uint256 timestamp
    );

    error HashAlreadyProcessed();
    error TransferFailed();
    error InvalidAddress();
    error AmountRequired();
    error DealNotFunded();

    constructor(address _corporateWallet) Ownable(msg.sender) {
        if (_corporateWallet == address(0)) revert InvalidAddress();
        corporateWallet = _corporateWallet;
    }

    function depositarEscrow(address payable _artist, string calldata _ipfsHash) external payable nonReentrant {
        if (_artist == address(0)) revert InvalidAddress();
        if (msg.value == 0) revert AmountRequired();
        if (deals[_ipfsHash].status != DealStatus.None) revert HashAlreadyProcessed();

        uint256 fee = (msg.value * SERVICE_FEE_BPS) / 10000;

        deals[_ipfsHash] = Deal({
            depositor: payable(msg.sender),
            artist: _artist,
            amount: msg.value,
            fee: fee,
            status: DealStatus.Funded
        });

        emit EscrowDeposited(_ipfsHash, msg.sender, _artist, msg.value, fee, block.timestamp);
    }

    function liberarPagoEscrow(string calldata _ipfsHash) external onlyOwner nonReentrant {
        Deal storage deal = deals[_ipfsHash];
        if (deal.status != DealStatus.Funded) revert DealNotFunded();

        uint256 netAmount = deal.amount - deal.fee;
        deal.status = DealStatus.Released;

        (bool feeSent, ) = payable(corporateWallet).call{value: deal.fee}("");
        if (!feeSent) revert TransferFailed();

        (bool artistSent, ) = deal.artist.call{value: netAmount}("");
        if (!artistSent) revert TransferFailed();

        emit FundsReleased(_ipfsHash, deal.artist, netAmount, deal.fee, block.timestamp);
    }

    function cancelarEscrow(string calldata _ipfsHash) external onlyOwner nonReentrant {
        Deal storage deal = deals[_ipfsHash];
        if (deal.status != DealStatus.Funded) revert DealNotFunded();

        deal.status = DealStatus.Cancelled;
        uint256 amount = deal.amount;

        (bool refunded, ) = deal.depositor.call{value: amount}("");
        if (!refunded) revert TransferFailed();

        emit EscrowCancelled(_ipfsHash, deal.depositor, amount, block.timestamp);
    }

    function setCorporateWallet(address _newWallet) external onlyOwner {
        if (_newWallet == address(0)) revert InvalidAddress();
        corporateWallet = _newWallet;
    }
}
