import ts from "typescript";
import { config } from "./utils";

const RegisterNetEvent = (data: string) => {
  ts.transpile(`RegisterNetEvent(${data})`);
};

let ESX: unknown;
emit("esx:getSharedObject", obj => (ESX = obj));

const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const executeQuery = async (sql, query, params) => {
  return new Promise((resolve, reject) => {
    globalThis.exports["mysql-async"][sql](query, params, (result, err) => {
      if (err) return reject(err);

      return resolve(result);
    });
  });
};

const multichar = ESX["GetConfig"]().Multichar;
const playerIdentity = {};
const alreadyRegistered = {};

if (!multichar) {
  on(`onResourceStart`, async resource => {
    if (resource == GetCurrentResourceName()) {
      await wait(300);

      while (!ESX) {
        await wait(10);
      }

      const xPlayers = ESX["GetPlayers"]();
      for (let i = 0; xPlayers.length; i++) {
        if (xPlayers[i]) {
          checkIdentity(xPlayers[i]);
        }
      }
    }
  });

  RegisterNetEvent(`esx:playerLoaded`);
  onNet(`esx:playerLoaded`, async (source, xPlayer) => {
    let identifier = "0";
    if (xPlayer) {
      identifier = xPlayer.identifier;
    } else {
      for (let i = 0; i < GetNumPlayerIdentifiers(source); i++) {
        const thisIdentifier = GetPlayerIdentifier(source, i);
        if (thisIdentifier.includes("steam:")) {
          identifier = thisIdentifier;
        }
      }
    }
    const result = await executeQuery(
      "mysql_fetch_all",
      "SELECT firstname, lastname, dateofbirth, sex FROM users WHERE identifier = @identifier",
      { "@identifier": identifier },
    );
    if (result[0]) {
      if (result[0].firstname) {
        playerIdentity[identifier] = {
          firstName: result[0].firstname,
          lastName: result[0].lastname,
          dateOfBirth: result[0].dateofbirth,
          sex: result[0].sex,
        };
        alreadyRegistered[identifier] = true;
      } else {
        playerIdentity[identifier] = null;
        alreadyRegistered[identifier] = false;
      }
    } else {
      playerIdentity[identifier] = null;
      alreadyRegistered[identifier] = false;
    }

    const currentIdentity = playerIdentity[identifier];
    if (currentIdentity && alreadyRegistered[identifier] == true) {
      xPlayer.setName(`${currentIdentity.firstName} ${currentIdentity.lastName}`);
      xPlayer.set("firstName", currentIdentity.firstName);
      xPlayer.set("lastName", currentIdentity.lastName);
      xPlayer.set("dateofbirth", currentIdentity.dateOfBirth);
      xPlayer.set("sex", currentIdentity.sex);
      if (currentIdentity.saveToDatabase) {
        saveIdentityToDatabase(identifier, currentIdentity);
      }
      await wait(10);
      emitNet(`gm_identity:alreadyRegistered`, source);
      playerIdentity[identifier] = null;
    } else {
      emitNet(`gm_identity:showRegisterIdentity`, source);
    }
  });
}

onNet(`gm_identity:registerIdentity`, data => {
  const xPlayer = ESX["GetPlayerFromId"](source);
  const dataa = data.data;
  let cb = false;

  if (xPlayer) {
    if (!alreadyRegistered[xPlayer.identifier]) {
      if (
        checkNameFormat(dataa["firstname"]) &&
        checkNameFormat(dataa["lastname"]) &&
        dataa["gender"]
      ) {
        playerIdentity[xPlayer.identifier] = {
          firstName: formatName(dataa["name"].first),
          lastName: formatName(dataa["name"].last),
          dateOfBirth: dataa["birthdate"],
          sex: dataa["gender"],
        };

        const currentIdentity = playerIdentity[xPlayer.identifier];

        xPlayer.setName(`${currentIdentity.firstName} ${currentIdentity.lastName}`);
        xPlayer.set("firstName", currentIdentity.firstName);
        xPlayer.set("lastName", currentIdentity.lastName);
        xPlayer.set("dateofbirth", currentIdentity.dateOfBirth);
        xPlayer.set("sex", currentIdentity.sex);

        saveIdentityToDatabase(xPlayer.identifier, currentIdentity);
        alreadyRegistered[xPlayer.identifier] = true;

        playerIdentity[xPlayer.identifier] = null;
        cb = true;
      } else {
        cb = false;
      }
    } else {
      cb = false;
    }
  } else {
    if (multichar && checkNameFormat(dataa.firstname) && checkNameFormat(dataa.lastname)) {
      emit("gm_identity:completedRegistration", source, dataa);
      cb = true;
    }
  }
  emitNet(`gm_identity:callback`, source, cb, data.CallbackID);
});

const checkNameFormat = (name: string): boolean => {
  if (
    /^([a-z,A-Z,á,é,í,ó,ú,â,ê,ô,ã,õ,ç,Á,É,Í,Ó,Ú,Â,Ê,Ô,Ã,Õ,Ç,ü,ñ,Ü,Ñ,ä,Ä,ö,Ö,ß" "]+)$/.test(name)
  ) {
    return true;
  } else {
    return false;
  }
};

const formatName = (name: string): string => {
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const checkIdentity = async xPlayer => {
  const result = await executeQuery(
    "mysql_fetch_all",
    "SELECT firstname, lastname, dateofbirth, sex FROM users WHERE identifier = @identifier",
    { "@identifier": xPlayer.identifier },
  );
  if (result[0]) {
    if (result[0].firstname) {
      playerIdentity[xPlayer.identifier] = {
        firstName: result[1].firstname,
        lastName: result[1].lastname,
        dateOfBirth: result[1].dateofbirth,
        sex: result[1].sex,
      };
      alreadyRegistered[xPlayer.identifier] = true;
      setIdentity(xPlayer);
    } else {
      playerIdentity[xPlayer.identifier] = null;
      alreadyRegistered[xPlayer.identifier] = false;
      emitNet(`gm_identity:showRegisterEntity`);
    }
  } else {
    emitNet(`gm_identity:showRegisterIdentity`, xPlayer.source);
  }
};

const setIdentity = xPlayer => {
  if (alreadyRegistered[xPlayer.identity]) {
    const currentIdentity = playerIdentity[xPlayer.identifier];

    xPlayer.setName(`${currentIdentity.firstName} ${currentIdentity.lastName}`);
    xPlayer.set("firstName", currentIdentity.firstName);
    xPlayer.set("lastName", currentIdentity.lastName);
    xPlayer.set("dateofbirth", currentIdentity.dateOfBirth);
    xPlayer.set("sex", currentIdentity.sex);

    if (currentIdentity.saveToDatabase) {
      saveIdentityToDatabase(xPlayer.identifier, currentIdentity);
    }

    playerIdentity[xPlayer.identifier] = null;
  }
};

const saveIdentityToDatabase = (identifier, identity) => {
  executeQuery(
    "mysql_execute",
    "UPDATE users SET firstname = @firstname, lastname = @lastname, dateofbirth = @dateofbirth, sex = @sex WHERE identifier = @identifier",
    {
      "@identifier": identifier,
      firstname: identity.firstName,
      lastname: identity.lastName,
      dateofbirth: identity.dateOfBirth,
      sex: identity.sex,
    },
  );
};
