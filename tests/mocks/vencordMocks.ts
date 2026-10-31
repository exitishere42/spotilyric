export const ActivityType = {
  PLAYING: 0,
  STREAMING: 1,
  LISTENING: 2,
  WATCHING: 3,
  CUSTOM_STATUS: 4,
  COMPETING: 5,
};

export const ActivityFlags = {
  INSTANCE: 1,
};

export const OptionType = {
  BOOLEAN: 1,
  STRING: 2,
  NUMBER: 3,
  SLIDER: 4,
  SELECT: 5,
};

export const FluxDispatcher = {
  dispatch: () => {},
};

export const UserSettings = {
  customStatus: {
    userSettingsAPIGroup: "status",
    userSettingsAPIName: "customStatus",
    getSetting: () => ({ text: "Saved text" }),
    updateSetting: async () => {},
  },
};

export const UserSettingsProtoStore = {
  addChangeListener: () => {},
  removeChangeListener: () => {},
};

export function definePluginSettings(opts: any) {
  const store: Record<string, any> = {};
  for (const [k, v] of Object.entries(opts as Record<string, any>)) {
    store[k] = v.default;
  }
  return { store };
}

export function getUserSettingLazy(group: string, name: string) {
  return {
    getSetting: () => null,
    updateSetting: async () => {},
  };
}

export function findByPropsLazy(...props: string[]) {
  return {};
}

export function findStoreLazy(name: string) {
  return {
    getActivity: () => null,
    getTrack: () => null,
    getPlayerState: () => null,
  };
}

export default function definePlugin(def: any) {
  return def;
}
