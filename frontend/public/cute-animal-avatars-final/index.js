// Auto-generated: 48 cute animal avatars (final)
import React from 'react';
import 01_bear from './avatars/01_bear.png';
import 02_fox from './avatars/02_fox.png';
import 03_rabbit from './avatars/03_rabbit.png';
import 04_koala from './avatars/04_koala.png';
import 05_mouse from './avatars/05_mouse.png';
import 06_cow from './avatars/06_cow.png';
import 07_cat from './avatars/07_cat.png';
import 08_dog from './avatars/08_dog.png';
import 09_raccoon from './avatars/09_raccoon.png';
import 10_giraffe from './avatars/10_giraffe.png';
import 11_lion from './avatars/11_lion.png';
import 12_monkey from './avatars/12_monkey.png';
import 13_sheep from './avatars/13_sheep.png';
import 14_bunny from './avatars/14_bunny.png';
import 15_elephant from './avatars/15_elephant.png';
import 16_blue_bird from './avatars/16_blue_bird.png';
import 17_duck from './avatars/17_duck.png';
import 18_penguin from './avatars/18_penguin.png';
import 19_turtle from './avatars/19_turtle.png';
import 20_fish from './avatars/20_fish.png';
import 21_frog from './avatars/21_frog.png';
import 22_penguin_baby from './avatars/22_penguin_baby.png';
import 23_lion_cub from './avatars/23_lion_cub.png';
import 24_parrot from './avatars/24_parrot.png';
import 25_penguin_round from './avatars/25_penguin_round.png';
import 26_narwhal from './avatars/26_narwhal.png';
import 27_kid from './avatars/27_kid.png';
import 28_dragon from './avatars/28_dragon.png';
import 29_robot from './avatars/29_robot.png';
import 30_koala_baby from './avatars/30_koala_baby.png';
import 31_owl from './avatars/31_owl.png';
import 32_tiger from './avatars/32_tiger.png';
import 33_horse from './avatars/33_horse.png';
import 34_seal from './avatars/34_seal.png';
import 35_turtle_baby from './avatars/35_turtle_baby.png';
import 36_whale from './avatars/36_whale.png';
import 37_penguin_alt from './avatars/37_penguin_alt.png';
import 38_kitten from './avatars/38_kitten.png';
import 39_dolphin from './avatars/39_dolphin.png';
import 40_squirrel from './avatars/40_squirrel.png';
import 41_gecko from './avatars/41_gecko.png';
import 42_robot_green from './avatars/42_robot_green.png';
import 43_squirrel_alt from './avatars/43_squirrel_alt.png';
import 44_chicken from './avatars/44_chicken.png';
import 45_alien from './avatars/45_alien.png';
import 46_dino from './avatars/46_dino.png';
import 47_sheep_fluffy from './avatars/47_sheep_fluffy.png';
import 48_snail from './avatars/48_snail.png';

export const animals = [
  { name: 'bear', src: 01_bear },
  { name: 'fox', src: 02_fox },
  { name: 'rabbit', src: 03_rabbit },
  { name: 'koala', src: 04_koala },
  { name: 'mouse', src: 05_mouse },
  { name: 'cow', src: 06_cow },
  { name: 'cat', src: 07_cat },
  { name: 'dog', src: 08_dog },
  { name: 'raccoon', src: 09_raccoon },
  { name: 'giraffe', src: 10_giraffe },
  { name: 'lion', src: 11_lion },
  { name: 'monkey', src: 12_monkey },
  { name: 'sheep', src: 13_sheep },
  { name: 'bunny', src: 14_bunny },
  { name: 'elephant', src: 15_elephant },
  { name: 'blue_bird', src: 16_blue_bird },
  { name: 'duck', src: 17_duck },
  { name: 'penguin', src: 18_penguin },
  { name: 'turtle', src: 19_turtle },
  { name: 'fish', src: 20_fish },
  { name: 'frog', src: 21_frog },
  { name: 'penguin_baby', src: 22_penguin_baby },
  { name: 'lion_cub', src: 23_lion_cub },
  { name: 'parrot', src: 24_parrot },
  { name: 'penguin_round', src: 25_penguin_round },
  { name: 'narwhal', src: 26_narwhal },
  { name: 'kid', src: 27_kid },
  { name: 'dragon', src: 28_dragon },
  { name: 'robot', src: 29_robot },
  { name: 'koala_baby', src: 30_koala_baby },
  { name: 'owl', src: 31_owl },
  { name: 'tiger', src: 32_tiger },
  { name: 'horse', src: 33_horse },
  { name: 'seal', src: 34_seal },
  { name: 'turtle_baby', src: 35_turtle_baby },
  { name: 'whale', src: 36_whale },
  { name: 'penguin_alt', src: 37_penguin_alt },
  { name: 'kitten', src: 38_kitten },
  { name: 'dolphin', src: 39_dolphin },
  { name: 'squirrel', src: 40_squirrel },
  { name: 'gecko', src: 41_gecko },
  { name: 'robot_green', src: 42_robot_green },
  { name: 'squirrel_alt', src: 43_squirrel_alt },
  { name: 'chicken', src: 44_chicken },
  { name: 'alien', src: 45_alien },
  { name: 'dino', src: 46_dino },
  { name: 'sheep_fluffy', src: 47_sheep_fluffy },
  { name: 'snail', src: 48_snail }
];

export const registry = Object.fromEntries(animals.map(a => [a.name, a.src]));

export function AnimalAvatar({ name, size = 128, alt = '', className = '', style = {} }) {
  const src = registry[name];
  if (!src) { console.warn(`[AnimalAvatar] Unknown name: ${name}`); return null; }
  const mergedStyle = Object.assign({ width: size, height: size }, style);
  return React.createElement('img', { src, width: size, height: size, alt: alt || name, className, style: mergedStyle });
}

export { default as 01_bear } from './avatars/01_bear.png';
export { default as 02_fox } from './avatars/02_fox.png';
export { default as 03_rabbit } from './avatars/03_rabbit.png';
export { default as 04_koala } from './avatars/04_koala.png';
export { default as 05_mouse } from './avatars/05_mouse.png';
export { default as 06_cow } from './avatars/06_cow.png';
export { default as 07_cat } from './avatars/07_cat.png';
export { default as 08_dog } from './avatars/08_dog.png';
export { default as 09_raccoon } from './avatars/09_raccoon.png';
export { default as 10_giraffe } from './avatars/10_giraffe.png';
export { default as 11_lion } from './avatars/11_lion.png';
export { default as 12_monkey } from './avatars/12_monkey.png';
export { default as 13_sheep } from './avatars/13_sheep.png';
export { default as 14_bunny } from './avatars/14_bunny.png';
export { default as 15_elephant } from './avatars/15_elephant.png';
export { default as 16_blue_bird } from './avatars/16_blue_bird.png';
export { default as 17_duck } from './avatars/17_duck.png';
export { default as 18_penguin } from './avatars/18_penguin.png';
export { default as 19_turtle } from './avatars/19_turtle.png';
export { default as 20_fish } from './avatars/20_fish.png';
export { default as 21_frog } from './avatars/21_frog.png';
export { default as 22_penguin_baby } from './avatars/22_penguin_baby.png';
export { default as 23_lion_cub } from './avatars/23_lion_cub.png';
export { default as 24_parrot } from './avatars/24_parrot.png';
export { default as 25_penguin_round } from './avatars/25_penguin_round.png';
export { default as 26_narwhal } from './avatars/26_narwhal.png';
export { default as 27_kid } from './avatars/27_kid.png';
export { default as 28_dragon } from './avatars/28_dragon.png';
export { default as 29_robot } from './avatars/29_robot.png';
export { default as 30_koala_baby } from './avatars/30_koala_baby.png';
export { default as 31_owl } from './avatars/31_owl.png';
export { default as 32_tiger } from './avatars/32_tiger.png';
export { default as 33_horse } from './avatars/33_horse.png';
export { default as 34_seal } from './avatars/34_seal.png';
export { default as 35_turtle_baby } from './avatars/35_turtle_baby.png';
export { default as 36_whale } from './avatars/36_whale.png';
export { default as 37_penguin_alt } from './avatars/37_penguin_alt.png';
export { default as 38_kitten } from './avatars/38_kitten.png';
export { default as 39_dolphin } from './avatars/39_dolphin.png';
export { default as 40_squirrel } from './avatars/40_squirrel.png';
export { default as 41_gecko } from './avatars/41_gecko.png';
export { default as 42_robot_green } from './avatars/42_robot_green.png';
export { default as 43_squirrel_alt } from './avatars/43_squirrel_alt.png';
export { default as 44_chicken } from './avatars/44_chicken.png';
export { default as 45_alien } from './avatars/45_alien.png';
export { default as 46_dino } from './avatars/46_dino.png';
export { default as 47_sheep_fluffy } from './avatars/47_sheep_fluffy.png';
export { default as 48_snail } from './avatars/48_snail.png';
