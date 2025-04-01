import { atom } from 'nanostores'


export type SettingsType = {
    gameMode: string;
    points: number;
};

export const $settings = atom<SettingsType>({
    gameMode: "single-out",
    points: 301,
})

export function newSettings(gameMode: string, points: number) {
    $settings.set({
        gameMode,
        points
    })
}