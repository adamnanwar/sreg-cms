import * as migration_20261101_041734_initial from './20261101_041734_initial';
import * as migration_20261101_050747_fase2 from './20261101_050747_fase2';
import * as migration_20261102_033612_loyverse_menu from './20261102_033612_loyverse_menu';

export const migrations = [
  {
    up: migration_20261101_041734_initial.up,
    down: migration_20261101_041734_initial.down,
    name: '20261101_041734_initial',
  },
  {
    up: migration_20261101_050747_fase2.up,
    down: migration_20261101_050747_fase2.down,
    name: '20261101_050747_fase2',
  },
  {
    up: migration_20261102_033612_loyverse_menu.up,
    down: migration_20261102_033612_loyverse_menu.down,
    name: '20261102_033612_loyverse_menu'
  },
];
