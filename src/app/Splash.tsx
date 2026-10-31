/** Заставка. Та же разметка есть в index.html — показывается до загрузки скриптов. */
export function Splash() {
  return (
    <div class="splash">
      <img class="k-logo" src={`${import.meta.env.BASE_URL}icon-192.png`} width={96} height={96} alt="" />
      <div class="splash-t">СКАТ 2.0</div>
      <div class="splash-v">{__APP_VERSION__}</div>
    </div>
  );
}
