import { Circuit } from "@tscircuit/core"
import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { getSimpleRouteJson } from "solver-utils"
import { MultilayerIjump } from "../../MultilayerIjump"
import { getDebugSvg } from "../../../infinite-grid-ijump-astar/tests/fixtures/get-debug-svg"

test("repro3: wild trace jump when goal-aligned point is blocked by orthogonal obstacle", () => {
  const circuit = new Circuit()

  circuit.add(
    <board width="12mm" height="14mm" routingDisabled>
      <chip name="U1" pcbX={-2} pcbY={5} footprint="soic8" />
      <resistor
        name="R1"
        resistance="1k"
        footprint="0402"
        pcbX={2.5}
        pcbY={-2}
      />
      <resistor
        name="R2"
        resistance="1k"
        footprint="0402"
        pcbX={-2}
        pcbY={-3}
        pcbRotation={90}
      />
      <trace from=".R1 > .pin2" to=".R2 > .pin1" />
    </board>,
  )

  const inputCircuitJson = circuit.getCircuitJson()
  const input = getSimpleRouteJson(inputCircuitJson, { layerCount: 1 })

  // Add obstacles matching the simplified reproduction where a goal-aligned stop
  // point sits directly above an obstacle blocking the turn toward the goal
  input.obstacles.push(
    {
      type: "rect",
      layers: ["top"],
      center: { x: 1, y: -5.7 },
      width: 1,
      height: 10,
      connectedTo: [],
    },
    {
      type: "rect",
      layers: ["top"],
      center: { x: 2.5, y: 5 },
      width: 2,
      height: 1,
      connectedTo: [],
    },
    {
      type: "rect",
      layers: ["top"],
      center: { x: -1.2, y: -1.1 },
      width: 2.6,
      height: 2.5,
      connectedTo: [],
    },
  )

  input.connections = [
    {
      name: "conn1",
      pointsToConnect: [
        { x: 3, y: -2, layer: "top" },
        { x: -2, y: -3, layer: "top" },
      ],
    },
  ]

  const autorouter = new MultilayerIjump({
    input,
    isRemovePathLoopsEnabled: false,
    debug: true,
  })

  const solution = autorouter.solveAndMapToTraces()
  expect(solution).toHaveLength(1)

  // Ensure the trace does not jump wildly upward toward U1 (y > 1)
  for (const pt of solution[0].route) {
    expect(pt.y).toBeLessThan(1)
  }

  expect(
    convertCircuitJsonToPcbSvg(inputCircuitJson.concat(solution as any) as any),
  ).toMatchSvgSnapshot(import.meta.path + "-pcb")

  expect(
    getDebugSvg({ inputCircuitJson, autorouter, solution, rowHeight: 15 }),
  ).toMatchSvgSnapshot(import.meta.path + "-debug")
})
