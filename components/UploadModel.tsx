import '@rainbow-me/rainbowkit/styles.css';
import { useAccount } from 'wagmi';
import { ImportModel } from './ImportModel';
import { Wallet } from './wallet';

function UploadModel() {
  const { isConnected } = useAccount();

  return (
    <>
      <div className='w-100 text-center standard-background px-2 py-2 mb-1'>
        <Wallet />
      </div>
      {isConnected && <ImportModel />}
    </>
  )
}

export default UploadModel
