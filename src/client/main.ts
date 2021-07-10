import ts from "typescript";
import { script } from "../config";
let callbacks: unknown;
callbacks = 0;
callbacks = {};
const RegisterNetEvent = (data: string) => {
  ts.transpile(`RegisterNetEvent(${data})`);
};
RegisterNetEvent(`gm_${script}:callback`);
onNet(`gm_${script}:callback`, (result: unknown, id: number) => {
  callbacks[id](result);
  delete callbacks[id];
});
const serverCallback = (name: string, data: unknown, cb: unknown): void => {
  let id: number;
  id = 0;
  id = Object.keys(callbacks).length++;
  callbacks[id] = cb;
  data["CallbackID"] = id;
  emitNet(name, data);
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////

import { conf, lang, wait, ESX, notifyText } from "./utils";

let loadingScreenFinished = false;
let isDead = false;
let guiEnabled = false;
let isConfigSynced = false;

const configLoaded = (): void => {
  isConfigSynced = true;
};

RegisterNetEvent(`gm_identity:alreadyRegistered`);
onNet(`gm_identity:alreadyRegistered`, async () => {
  while (!loadingScreenFinished) {
    await wait(100);
  }
  emit(`esx_skin:playerRegistered`);
});

on(`esx:loadingScreenOff`, () => {
  loadingScreenFinished = true;
});

on(`esx:onPlayerDeath`, () => {
  isDead = true;
});

on(`esx:onPlayerSpawn`, () => {
  isDead = false;
});

const enableGui = (state: boolean) => {
  SetNuiFocus(state, state);
  guiEnabled = state;

  SendNuiMessage(
    JSON.stringify({
      type: "enableui",
      enable: state,
    }),
  );
};

RegisterNetEvent(`gm_identity:showRegisterIdentity`);
onNet(`gm_identity:showRegisterIdentity`, () => {
  emit(`esx_skin:resetFirstSpawn`);
  if (!isDead) {
    enableGui(true);
  }
});

RegisterNuiCallbackType("lang")
on("__cfx_nui:lang", (data, cb) => {
  const interval = setTick(() => {
    if (isConfigSynced) {
      cb(lang["menu"]);
      clearTick(interval);
    }
  });
})

RegisterNuiCallbackType("css")
on("__cfx_nui:css", (data, cb) => {
  const interval = setTick(() => {
    if (isConfigSynced) {
      cb({
        scale: conf["appearance"].scale,
        borderRadScale: conf["appearance"].borderRadScale,
        bgPrimary: conf["appearance"].colors.bgPrimary,
        bgSecondary: conf["appearance"].colors.bgSecondary,
        bgTertiary: conf["appearance"].colors.bgTertiary,
        colorPrimary: conf["appearance"].colors.primary,
        colorSecondary: conf["appearance"].colors.secondary,
        colorError: conf["appearance"].colors.error,
        textPrimary: conf["appearance"].colors.textPrimary,
        textSecondary: conf["appearance"].colors.textSecondary,
        textPlaceholder: conf["appearance"].colors.textPlaceholder,
      });
      clearTick(interval);
    }
  });
})

RegisterNuiCallbackType("create");
on("__cfx_nui:create", (data, cb) => {
  serverCallback(`gm_identity:registerIdentity`, {data: data}, cb => {
    if (cb) {
      notifyText(lang["registration_success"]);
      enableGui(false);
      if (!ESX["GetConfig"]().Multichar) {
        emit("esx_skin:playerRegistered");
      }
    } else {
      notifyText(lang["registration_error"]);
    }
  })
});

setTick(() => {
  if (guiEnabled) {
    DisableControlAction(0, 1, true);
    DisableControlAction(0, 2, true);
    DisableControlAction(0, 106, true);
    DisableControlAction(0, 142, true);
    DisableControlAction(0, 30, true);
    DisableControlAction(0, 31, true);
    DisableControlAction(0, 21, true);
    DisableControlAction(0, 24, true);
    DisableControlAction(0, 25, true);
    DisableControlAction(0, 47, true);
    DisableControlAction(0, 58, true);
    DisableControlAction(0, 263, true);
    DisableControlAction(0, 264, true);
    DisableControlAction(0, 257, true);
    DisableControlAction(0, 140, true);
    DisableControlAction(0, 141, true);
    DisableControlAction(0, 143, true);
    DisableControlAction(0, 75, true);
    DisableControlAction(27, 75, true);
  }
});

export { configLoaded };
