export function latLonToVector3(lat, lon, radius = 2) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y:   radius * Math.cos(phi),
    z:   radius * Math.sin(phi) * Math.sin(theta),
  }
}
