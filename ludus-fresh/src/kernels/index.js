// Subject kernels registry — each {concepts, prerequisites, misconceptions,
// diagnostic, practice, transfer, checker, compute}. Pure, no AI calls.
import { mathsKernel } from "./maths.js";
import { cloudsKernel } from "./clouds.js";
import { animalsKernel } from "./animals.js";
import { castleKernel } from "./engineering-castle.js";
import { businessKernel } from "./business.js";
import { carsKernel } from "./cars.js";
import { historyKernel } from "./history.js";
import { physicsKernel } from "./physics.js";
import { codingKernel } from "./coding.js";
import { obscureKernel } from "./obscure.js";
export { mathsKernel, cloudsKernel, animalsKernel, castleKernel, businessKernel, carsKernel, historyKernel, physicsKernel, codingKernel, obscureKernel };
export const KERNELS = [mathsKernel, cloudsKernel, animalsKernel, castleKernel, businessKernel, carsKernel, historyKernel, physicsKernel, codingKernel, obscureKernel];
export function kernelForTopic(topic) {
  const t = String(topic || "").toLowerCase();
  if (/fraction|math|area|volume|ratio|percent/.test(t)) return mathsKernel;
  if (/cloud|water cycle|evapor|condens|weather|rain/.test(t)) return cloudsKernel;
  if (/animal|habitat|ecolog|species|wildlife|biolog/.test(t)) return animalsKernel;
  if (/castle|engineer|bridge|wall|structure|build|fortress|geometry|architecture/.test(t)) return castleKernel;
  if (/business|budget|profit|price|shop|market|money|cost/.test(t)) return businessKernel;
  if (/\b(cars?|vehicles?|engines?|gears?|gearbox|driving|brakes?|braking|automobiles?|motors?)\b/.test(t)) return carsKernel;
  if (/histor|ancient|empire|century|centuries|world war|revolution|kingdom|pharaoh/.test(t)) return historyKernel;
  if (/physic|force|motion|velocity|kinetic|energy|circuit|electric|gravity|magnet|newton/.test(t)) return physicsKernel;
  if (/coding|code|program|python|javascript|algorithm|\bloops?\b|\bvariables?\b|debug|software/.test(t)) return codingKernel;
  return obscureKernel;
}
export function kernelById(id) { return KERNELS.find((k) => k.id === id) || obscureKernel; }
