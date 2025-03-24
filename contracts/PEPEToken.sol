// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
.______    _______ .______    _______    .___________. __    __  .______    _______     _______.
|   _  \  |   ____||   _  \  |   ____|   |           ||  |  |  | |   _  \  |   ____|   /       |
|  |_)  | |  |__   |  |_)  | |  |__      `---|  |----`|  |  |  | |  |_)  | |  |__     |   (----`
|   ___/  |   __|  |   ___/  |   __|         |  |     |  |  |  | |   _  <  |   __|     \   \    
|  |      |  |____ |  |      |  |____        |  |     |  `--'  | |  |_)  | |  |____.----)   |   
| _|      |_______|| _|      |_______|       |__|      \______/  |______/  |_______|_______/    
*/

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PEPEToken is ERC20, Ownable {
    uint256 private constant MAX_SUPPLY = 100_000_000_000 * 10**18;

    constructor() ERC20("PEPE", "PEPE") Ownable(msg.sender) {
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    // View function to get max supply
    function getMaxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }
}