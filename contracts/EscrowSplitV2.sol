// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EscrowSplitV2
 * @dev Ecosistema de Liquidación Automatizada para Festivales de Música en Latam.
 *      Distribuye fondos entre 3 actores en una sola transacción:
 *      - Artista (NET_ARTIST_BPS %)
 *      - Municipalidad/Estado (TAX_BPS % - retención fiscal inmutable)
 *      - Productora/Corporativa (SERVICE_FEE_BPS % - comisión de servicio)
 */
contract EscrowSplitV2 is Ownable, ReentrancyGuard {

    // ─── Deal State Machine ───────────────────────────────────────────
    enum DealStatus { None, Funded, Released, Cancelled }

    struct Deal {
        address payable depositor;
        address payable artist;
        uint256 amount;
        uint256 feeService;     // Comisión productora (1%)
        uint256 feeTax;         // Retención fiscal municipalidad (2%)
        DealStatus status;
        uint256 createdAt;
    }

    // ─── Fee Configuration ────────────────────────────────────────────
    uint256 public constant SERVICE_FEE_BPS = 0;    // Sin comisión para esta simulación
    uint256 public constant TAX_FEE_BPS     = 480;  // 3.6% AE + 1.2% Sellos = 4.8% Total DGR Salta
    uint256 public constant BPS_BASE        = 10000;

    // ─── Wallets ──────────────────────────────────────────────────────
    address public corporateWallet;    // Productora / Ticketera
    address public municipalWallet;    // Municipalidad de Salta / Estado

    // ─── Storage ─────────────────────────────────────────────────────
    mapping(string => Deal) public deals;
    uint256 public totalVolumeProcessed;
    uint256 public totalTaxCollected;
    uint256 public totalDealsReleased;

    // ─── Events ───────────────────────────────────────────────────────
    event EscrowFunded(
        string indexed ipfsHash,
        address indexed depositor,
        address indexed artist,
        uint256 amount,
        uint256 timestamp
    );

    event FundsReleased(
        string indexed ipfsHash,
        address indexed artist,
        uint256 netAmount,
        uint256 feeService,
        uint256 feeTax,
        uint256 timestamp
    );

    event FiscalRetentionPaid(
        string indexed ipfsHash,
        address indexed municipalWallet,
        uint256 taxAmount,
        uint256 timestamp
    );

    event EscrowCancelled(
        string indexed ipfsHash,
        address indexed depositor,
        uint256 refundAmount,
        uint256 timestamp
    );

    // ─── Errors ───────────────────────────────────────────────────────
    error InvalidAddress();
    error AmountRequired();
    error DealAlreadyExists();
    error DealNotFunded();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────
    constructor(
        address _corporateWallet,
        address _municipalWallet
    ) Ownable(msg.sender) {
        if (_corporateWallet == address(0)) revert InvalidAddress();
        if (_municipalWallet == address(0)) revert InvalidAddress();
        corporateWallet = _corporateWallet;
        municipalWallet = _municipalWallet;
    }

    // ─── Core Functions ───────────────────────────────────────────────

    /**
     * @notice Deposita fondos en escrow para un show/evento.
     * @param _artist Wallet del artista beneficiario.
     * @param _ipfsHash Hash IPFS del contrato comercial firmado.
     */
    function depositarEscrow(
        address payable _artist,
        string calldata _ipfsHash
    ) external payable nonReentrant {
        if (_artist == address(0)) revert InvalidAddress();
        if (msg.value == 0) revert AmountRequired();
        if (deals[_ipfsHash].status != DealStatus.None) revert DealAlreadyExists();

        uint256 feeService = (msg.value * SERVICE_FEE_BPS) / BPS_BASE;
        uint256 feeTax     = (msg.value * TAX_FEE_BPS) / BPS_BASE;

        deals[_ipfsHash] = Deal({
            depositor:  payable(msg.sender),
            artist:     _artist,
            amount:     msg.value,
            feeService: feeService,
            feeTax:     feeTax,
            status:     DealStatus.Funded,
            createdAt:  block.timestamp
        });

        emit EscrowFunded(_ipfsHash, msg.sender, _artist, msg.value, block.timestamp);
    }

    /**
     * @notice Libera fondos del escrow realizando el split triple automático.
     *         Solo el Owner (Productora) puede ejecutar esta función.
     * @param _ipfsHash Hash IPFS del contrato a liquidar.
     */
    function liberarPagoEscrow(
        string calldata _ipfsHash
    ) external onlyOwner nonReentrant {
        Deal storage deal = deals[_ipfsHash];
        if (deal.status != DealStatus.Funded) revert DealNotFunded();

        uint256 netAmount  = deal.amount - deal.feeService - deal.feeTax;
        deal.status = DealStatus.Released;

        // Actualizar métricas globales
        totalVolumeProcessed += deal.amount;
        totalTaxCollected    += deal.feeTax;
        totalDealsReleased   += 1;

        // 1. Retención fiscal → Municipalidad (2%)
        (bool taxSent, ) = payable(municipalWallet).call{value: deal.feeTax}("");
        if (!taxSent) revert TransferFailed();
        emit FiscalRetentionPaid(_ipfsHash, municipalWallet, deal.feeTax, block.timestamp);

        // 2. Comisión → Productora / Corporativa (1%)
        (bool feeSent, ) = payable(corporateWallet).call{value: deal.feeService}("");
        if (!feeSent) revert TransferFailed();

        // 3. Pago neto → Artista (97%)
        (bool artistSent, ) = deal.artist.call{value: netAmount}("");
        if (!artistSent) revert TransferFailed();

        emit FundsReleased(
            _ipfsHash,
            deal.artist,
            netAmount,
            deal.feeService,
            deal.feeTax,
            block.timestamp
        );
    }

    /**
     * @notice Cancela un escrow y devuelve fondos al depositante.
     */
    function cancelarEscrow(
        string calldata _ipfsHash
    ) external onlyOwner nonReentrant {
        Deal storage deal = deals[_ipfsHash];
        if (deal.status != DealStatus.Funded) revert DealNotFunded();

        deal.status = DealStatus.Cancelled;
        uint256 amount = deal.amount;

        (bool refunded, ) = deal.depositor.call{value: amount}("");
        if (!refunded) revert TransferFailed();

        emit EscrowCancelled(_ipfsHash, deal.depositor, amount, block.timestamp);
    }

    // ─── View Functions ───────────────────────────────────────────────

    /**
     * @notice Calcula el breakdown del split para un monto dado.
     */
    function calcularSplit(uint256 _amount) external pure returns (
        uint256 artistAmount,
        uint256 taxAmount,
        uint256 serviceAmount
    ) {
        serviceAmount = (_amount * SERVICE_FEE_BPS) / BPS_BASE;
        taxAmount     = (_amount * TAX_FEE_BPS) / BPS_BASE;
        artistAmount  = _amount - serviceAmount - taxAmount;
    }

    /**
     * @notice Obtiene el estado de un deal por su hash IPFS.
     */
    function getDeal(string calldata _ipfsHash) external view returns (Deal memory) {
        return deals[_ipfsHash];
    }

    // ─── Admin ────────────────────────────────────────────────────────

    function setCorporateWallet(address _newWallet) external onlyOwner {
        if (_newWallet == address(0)) revert InvalidAddress();
        corporateWallet = _newWallet;
    }

    function setMunicipalWallet(address _newWallet) external onlyOwner {
        if (_newWallet == address(0)) revert InvalidAddress();
        municipalWallet = _newWallet;
    }
}
