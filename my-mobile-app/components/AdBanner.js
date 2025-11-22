import { AdMobBanner } from "expo-ads-admob";

export default function AdBanner() {
  return (
    <AdMobBanner
      bannerSize="smartBanner"
      adUnitID="ca-app-pub-3940256099942544/6300978111" // TEST banner
      servePersonalizedAds={false}
      onDidFailToReceiveAdWithError={(e) => console.log(e)}
    />
  );
}
