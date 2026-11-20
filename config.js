/**
 * Swap & Shop Web App Configuration
 *
 * 1. Live Read & Two-Way Reserve/Claim (Optional upgrade):
 *    Deploy apps-script/Code.gs as a Web App from Extensions -> Apps Script
 *    and paste the deployed URL into APPS_SCRIPT_URL below.
 *
 * 2. Out-of-the-box mode (Works immediately):
 *    - Loads local snapshot (data/inventory.json) instantly.
 *    - Also tries live public Google Sheet read if the sheet is view-shared.
 *    - Reserve / Ask and Claim for Upcycle open the pre-filled Google Form.
 */
window.SWAP_SHOP_CONFIG = {
  SHEET_ID: "14TtFI4EcqZlrT9Wf-RGkicHDps_yOkrXuNCwiEgmogs",
  SHEET_TAB: "Inventory",
  ENABLE_PUBLIC_SHEET_SYNC: false,
  APPS_SCRIPT_URL: "https://script.google.com/a/macros/dc.edu.hk/s/AKfycbwwDQJmqMm7uMc4eW7avvx5jLood7Rcdjm5uIwjHPsTcTxmaopeosqeG6MkVnIc-Dpu/exec",
  GOOGLE_FORM: {
    baseUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeyjJBug2Bit2sxt_UNAFuddrBCll9gfK5UZXsg9AZzrr5WBA/viewform",
    entryItemId: "entry.1081046035",
    entryDescription: "entry.864598478",
    entryRequestType: "entry.362456835",
    reserveLabel: "Reserve / Ask to Buy",
    upcycleLabel: "Claim for Upcycle"
  }
};
