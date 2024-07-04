import { Chain, configureChains, mainnet } from 'wagmi';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { publicProvider } from 'wagmi/providers/public';

import { NETWORK_NAME, RPC_URL, CHAIN_ID, BLOCK_EXPLORER_URL, ICON } from './env';

const dchaintestnet: Chain = {
  id: CHAIN_ID,
  name: NETWORK_NAME,
  network: 'dchain_testnet',
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
    public: {
      http: [RPC_URL],
    },
  },
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorers: {
    default: { name: 'DChain Block Explorer', url: BLOCK_EXPLORER_URL },
  },
};

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    {
      ...dchaintestnet,
      iconUrl: ICON,
    },
    mainnet,
  ],
  [publicProvider()],
);

const coinbaseWalletConnector = new CoinbaseWalletConnector({ chains, options: { appName: 'wagmi' } });
const metaMaskWalletConnector = new MetaMaskConnector({ chains });

const trustWalletConnector = new InjectedConnector({
  chains,
  options: {
    name: 'GN',
    shimDisconnect: true,
    getProvider: () => (typeof window !== 'undefined' ? (window as any).trustwallet : undefined),
  },
});


export {
  chains, coinbaseWalletConnector, metaMaskWalletConnector, publicClient, trustWalletConnector, webSocketPublicClient
};