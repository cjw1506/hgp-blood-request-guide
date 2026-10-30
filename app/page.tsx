import App from "./App";
import { ownerRecoveryEnabled } from "./lib/deployment";
export const dynamic="force-dynamic";
export default function Home(){return <App allowOwnerRecovery={ownerRecoveryEnabled()}/>;}
