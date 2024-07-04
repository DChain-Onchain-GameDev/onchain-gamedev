import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { WagmiConfig, createConfig } from 'wagmi'
import { RainbowKitProvider, connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit'
import { chains, publicClient, webSocketPublicClient } from '../config/wallet'

export default function App({ Component, pageProps }: AppProps) {

  const projectId = '8db95bf7ae240481064a721e411c1161';
  
const { wallets } = getDefaultWallets({
  projectId,
  appName: 'dchain-game-dev',
  chains,
});

const connectors = connectorsForWallets([
  ...wallets,
]);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  webSocketPublicClient,
  publicClient,
});

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider modalSize="compact" chains={chains}>
      <Component {...pageProps}   />
     </RainbowKitProvider>
     </WagmiConfig>
  );
}
