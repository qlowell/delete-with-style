/* Delete With Style — ribbon menu commands.
   Each menu item opens effect.html in a pop-up with the current email's details. */
const DWS_FUNCTIONS = {
  fire: "dwsBurn", shred: "dwsShred", plane: "dwsPlane", hole: "dwsBlackHole",
  shoot: "dwsShoot", chipper: "dwsChipper", hammer: "dwsHammer", car: "dwsCar", random: "dwsRandom"
};

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function finish(event) {
  try { event.completed(); } catch (e) { /* already completed */ }
}

function launch(kind, event) {
  const item = Office.context.mailbox.item;
  const from = item.from || item.sender || {};
  const created = item.dateTimeCreated ? new Date(item.dateTimeCreated) : null;
  const data = {
    subj: item.subject || "(no subject)",
    from: from.displayName || "",
    addr: from.emailAddress || "",
    time: created ? created.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""
  };

  item.body.getAsync(Office.CoercionType.Text, result => {
    let body = result.status === Office.AsyncResultStatus.Succeeded ? (result.value || "") : "";
    body = body.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    data.body = body.slice(0, 900);

    const url = new URL("effect.html", window.location.href);
    url.searchParams.set("fx", kind);
    url.searchParams.set("d", toBase64Url(JSON.stringify(data)));

    Office.context.ui.displayDialogAsync(url.toString(), { height: 85, width: 75, displayInIframe: true }, res => {
      if (res.status !== Office.AsyncResultStatus.Succeeded) { finish(event); return; }
      const dialog = res.value;
      dialog.addEventHandler(Office.EventType.DialogMessageReceived, () => { dialog.close(); finish(event); });
      dialog.addEventHandler(Office.EventType.DialogEventReceived, () => finish(event));
    });
  });
}

Object.keys(DWS_FUNCTIONS).forEach(kind => {
  window[DWS_FUNCTIONS[kind]] = event => launch(kind, event);
});

Office.onReady(() => {
  if (Office.actions && Office.actions.associate) {
    Object.keys(DWS_FUNCTIONS).forEach(kind => {
      Office.actions.associate(DWS_FUNCTIONS[kind], window[DWS_FUNCTIONS[kind]]);
    });
  }
});
