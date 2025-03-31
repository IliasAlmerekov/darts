import { atom } from 'nanostores'


export type SettingsType = {
    gameMode: string;
    points: number;
    sets: number;
    legs: number;
};

export const $settings = atom<SettingsType>({
    gameMode: "single-out",
    points: 301,
    sets: 1,
    legs: 1
})

export function newSettings(gameMode: string, points: number, sets: number, legs: number) {
    $settings.set({
        gameMode,
        points,
        sets,
        legs
    })
}