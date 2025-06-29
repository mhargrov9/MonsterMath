// This file maps monster IDs and levels to their static image filenames.
// This is the single source of truth for monster imagery.

const monsterImageMap: Record<number, Record<number, string>> = {
    6: { // Gigalith
        1: "Gigalith_Level_1_1749856385841.png",
        2: "Gigalith_Level_2_1749856393905.png",
        3: "Gigalith_Level_3_1749856409063.png",
        4: "Gigalith_Level_4_1749856409062.png",
        5: "Gigalith_Level_5_1749856409060.png",
        6: "Gigalith_Level_6_1749856409059.png",
        7: "Gigalith_Level_7_1749856409059.png",
        8: "Gigalith_Level_8_1749856409058.png",
        9: "Gigalith_Level_9_1749856409058.png",
        10: "Gigalith_Level_10_1749856409057.png"
    },
    7: { // Aetherion
        1: 'Aetherion_Level_1_1749866902477.png',
        2: 'Aetherion_Level_2_1749866902476.png',
        3: 'Aetherion_Level_3_1749866902476.png',
        4: 'Aetherion_Level_4_1749866902475.png',
        5: 'Aetherion_Level_5_1749866902475.png',
        6: 'Aetherion_Level_6_1749866902475.png',
        7: 'Aetherion_Level_7_1749866902474.png',
        8: 'Aetherion_Level_8_1749866902474.png',
        9: 'Aetherion_Level_9_1749866902473.png',
        10: 'Aetherion_Level_10_1749866902471.png'
    },
    8: { // Geode Tortoise
        1: 'Geode Tortoise_Level_1_1750198366952.png',
        2: 'Geode Tortoise_Level_2_1750198366941.png',
        3: 'Geode Tortoise_Level_3_1750198366935.png'
    },
    9: { // Gale-Feather Griffin
        1: 'Gale-Feather Griffin_Level_1_1750198352902.png',
        2: 'Gale-Feather Griffin_Level_2_1750198352909.png',
        3: 'Gale-Feather Griffin_Level_3_1750198352897.png'
    },
    10: { // Cinder-Tail Salamander
        1: 'Cinder-Tail Salamander_Level_1_1750198337385.png',
        2: 'Cinder-Tail Salamander_Level_2_1750198337394.png',
        3: 'Cinder-Tail Salamander_Level_3_1750198337399.png'
    },
    11: { // River-Spirit Axolotl
        1: 'River-Spirit Axolotl_Level_1_1750198323311.png',
        2: 'River-Spirit Axolotl_Level_2_1750198323302.png',
        3: 'River-Spirit Axolotl_Level_3_1750198323314.png'
    },
    12: { // Spark-Tail Squirrel
        1: 'Spark-Tail Squirrel_Level_1_1750198309057.png',
        2: 'Spark-Tail Squirrel_Level_2_1750198309051.png',
        3: 'Spark-Tail Squirrel_Level_3_1750198309026.png'
    }
};

export const getMonsterImageUrl = (monsterId: number, level: number): string => {
    const fallbackImage = '/assets/placeholder.png'; // A default placeholder image
    const monsterLevels = monsterImageMap[monsterId];
    if (!monsterLevels) {
        return fallbackImage;
    }

    const filename = monsterLevels[level] || monsterLevels[1]; // Fallback to level 1 image if specific level is missing

    // NOTE: The user has stored images in `attached_assets`. We will use this path.
    return `/attached_assets/${filename}`;
};