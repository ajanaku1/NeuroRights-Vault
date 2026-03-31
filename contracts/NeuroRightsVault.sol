// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NeuroRightsVault {
    // ──────────────────────────── Data Structures ────────────────────────────

    struct Dataset {
        address owner;
        bytes32 cid;
        string metadata;
        uint256 pricePerAccess;
        uint256 totalEarnings;
        uint256 createdAt;
        bool active;
    }

    struct License {
        address researcher;
        uint256 expiry;
        string purpose;
        bool active;
        uint256 grantedAt;
    }

    struct PendingRequest {
        address requester;
        uint256 amount;
        bool pending;
    }

    // ──────────────────────────── State ──────────────────────────────────────

    uint256 public datasetCount;

    mapping(uint256 => Dataset) public datasets;
    mapping(uint256 => License[]) private _licenses;
    mapping(address => uint256[]) private _ownerDatasets;
    mapping(uint256 => mapping(address => uint256)) private _withdrawable;
    mapping(uint256 => PendingRequest[]) private _pendingRequests;

    // ──────────────────────────── Events ─────────────────────────────────────

    event DatasetRegistered(
        uint256 indexed datasetId,
        address indexed owner,
        bytes32 cid,
        string metadata,
        uint256 pricePerAccess
    );

    event LicenseGranted(
        uint256 indexed datasetId,
        address indexed researcher,
        uint256 expiry,
        string purpose
    );

    event LicenseRevoked(
        uint256 indexed datasetId,
        address indexed researcher,
        uint256 revokedAt
    );

    event AccessRequested(
        uint256 indexed datasetId,
        address indexed researcher,
        uint256 payment
    );

    event AccessApproved(
        uint256 indexed datasetId,
        address indexed researcher,
        uint256 payment
    );

    event AccessRejected(
        uint256 indexed datasetId,
        address indexed researcher,
        uint256 refundAmount
    );

    // ──────────────────────────── Modifiers ──────────────────────────────────

    modifier onlyDatasetOwner(uint256 datasetId) {
        require(datasetId < datasetCount, "Dataset does not exist");
        require(
            datasets[datasetId].owner == msg.sender,
            "Only dataset owner can perform this action"
        );
        _;
    }

    // ──────────────────────────── Core Functions ─────────────────────────────

    function registerDataset(
        bytes32 cid,
        string calldata metadata,
        uint256 pricePerAccess
    ) external returns (uint256 datasetId) {
        datasetId = datasetCount;

        datasets[datasetId] = Dataset({
            owner: msg.sender,
            cid: cid,
            metadata: metadata,
            pricePerAccess: pricePerAccess,
            totalEarnings: 0,
            createdAt: block.timestamp,
            active: true
        });

        _ownerDatasets[msg.sender].push(datasetId);
        datasetCount++;

        emit DatasetRegistered(datasetId, msg.sender, cid, metadata, pricePerAccess);
    }

    function grantLicense(
        uint256 datasetId,
        address researcher,
        uint256 duration,
        string calldata purpose
    ) external onlyDatasetOwner(datasetId) {
        require(researcher != address(0), "Invalid researcher address");
        require(duration > 0, "Duration must be greater than zero");

        uint256 expiry = block.timestamp + duration;

        _licenses[datasetId].push(
            License({
                researcher: researcher,
                expiry: expiry,
                purpose: purpose,
                active: true,
                grantedAt: block.timestamp
            })
        );

        emit LicenseGranted(datasetId, researcher, expiry, purpose);
    }

    function revokeLicense(
        uint256 datasetId,
        address researcher
    ) external onlyDatasetOwner(datasetId) {
        License[] storage licenses = _licenses[datasetId];
        bool found = false;

        for (uint256 i = 0; i < licenses.length; i++) {
            if (licenses[i].researcher == researcher && licenses[i].active) {
                licenses[i].active = false;
                found = true;
            }
        }

        require(found, "No active license found for researcher");
        emit LicenseRevoked(datasetId, researcher, block.timestamp);
    }

    /// @notice Request access — funds held in escrow until owner approves or rejects.
    function requestAccess(uint256 datasetId) external payable {
        require(datasetId < datasetCount, "Dataset does not exist");
        Dataset storage ds = datasets[datasetId];
        require(ds.active, "Dataset is not active");
        require(msg.value >= ds.pricePerAccess, "Insufficient payment");

        _pendingRequests[datasetId].push(PendingRequest({
            requester: msg.sender,
            amount: msg.value,
            pending: true
        }));

        emit AccessRequested(datasetId, msg.sender, msg.value);
    }

    /// @notice Approve an access request — release escrow to owner and grant license.
    function approveAccess(
        uint256 datasetId,
        uint256 requestIndex,
        uint256 duration,
        string calldata purpose
    ) external onlyDatasetOwner(datasetId) {
        PendingRequest storage req = _pendingRequests[datasetId][requestIndex];
        require(req.pending, "Request not pending");
        req.pending = false;

        // Credit owner
        datasets[datasetId].totalEarnings += req.amount;
        _withdrawable[datasetId][msg.sender] += req.amount;

        // Grant license
        uint256 expiry = block.timestamp + duration;
        _licenses[datasetId].push(
            License({
                researcher: req.requester,
                expiry: expiry,
                purpose: purpose,
                active: true,
                grantedAt: block.timestamp
            })
        );

        emit AccessApproved(datasetId, req.requester, req.amount);
        emit LicenseGranted(datasetId, req.requester, expiry, purpose);
    }

    /// @notice Reject an access request — refund the requester.
    function rejectAccess(
        uint256 datasetId,
        uint256 requestIndex
    ) external onlyDatasetOwner(datasetId) {
        PendingRequest storage req = _pendingRequests[datasetId][requestIndex];
        require(req.pending, "Request not pending");
        req.pending = false;

        uint256 refundAmount = req.amount;
        address requester = req.requester;

        emit AccessRejected(datasetId, requester, refundAmount);

        (bool success, ) = payable(requester).call{value: refundAmount}("");
        require(success, "Refund failed");
    }

    function withdraw(uint256 datasetId) external onlyDatasetOwner(datasetId) {
        uint256 amount = _withdrawable[datasetId][msg.sender];
        require(amount > 0, "No earnings to withdraw");

        _withdrawable[datasetId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    // ──────────────────────────── View Functions ─────────────────────────────

    function getMyDatasets(
        address owner
    ) external view returns (uint256[] memory) {
        return _ownerDatasets[owner];
    }

    function getActiveLicenses(
        uint256 datasetId
    ) external view returns (License[] memory) {
        require(datasetId < datasetCount, "Dataset does not exist");

        License[] storage all = _licenses[datasetId];
        uint256 activeCount = 0;

        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].active && all[i].expiry > block.timestamp) {
                activeCount++;
            }
        }

        License[] memory result = new License[](activeCount);
        uint256 idx = 0;

        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].active && all[i].expiry > block.timestamp) {
                result[idx] = all[i];
                idx++;
            }
        }

        return result;
    }

    function hasActiveLicense(
        uint256 datasetId,
        address researcher
    ) external view returns (bool) {
        if (datasetId >= datasetCount) return false;
        License[] storage all = _licenses[datasetId];
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].researcher == researcher && all[i].active && all[i].expiry > block.timestamp) {
                return true;
            }
        }
        return false;
    }

    function getPendingRequests(
        uint256 datasetId
    ) external view returns (PendingRequest[] memory) {
        require(datasetId < datasetCount, "Dataset does not exist");

        PendingRequest[] storage all = _pendingRequests[datasetId];
        uint256 pendingCount = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].pending) pendingCount++;
        }

        PendingRequest[] memory result = new PendingRequest[](pendingCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (all[i].pending) {
                result[idx] = all[i];
                idx++;
            }
        }
        return result;
    }

    function getPendingRequestsRaw(
        uint256 datasetId
    ) external view returns (PendingRequest[] memory) {
        return _pendingRequests[datasetId];
    }
}
