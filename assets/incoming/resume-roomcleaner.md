# Résumé entry — RoomCleaner (copy/paste into the PDF résumé)

Status note: the project is currently **simulation + analysis validated, parts ordered,
hardware bring-up next**. These bullets are written to claim the design and analysis
work accurately without implying a finished, operating robot. Once it is running,
swap in measured results (actual grab success rate, cycle time, etc.).

---

## Section heading
**PROJECTS**

## Entry header
**RoomCleaner — Autonomous Laundry-Picking Cable Robot** | Personal Project
*College Station, TX · Jul 2026 – Present*

## Bullet points

- Designed a ceiling-mounted cable-driven parallel robot that positions a gripper anywhere
  in a room from four winch-driven cables, deriving the inverse kinematics that map a target
  (x, y, z) position to four commanded spool lengths.
- Developed a closed-form cable-statics model solving for four non-negative tensions, and used
  it to size NEMA 17 steppers to 2.6× the worst-case cable tension (12 N peak vs. 40 N motor
  limit, 3.3× headroom) and to verify a 4 kg payload across the full workspace (10.6 kg at center).
- Modeled eight fully parametric 3D-printed components in CadQuery (Python) with STEP/STL export,
  including a five-finger tendon-driven TPU gripper actuated by a single servo to grasp flat,
  crumpled fabric that a rigid claw cannot pick up.
- Ran a calibration-sensitivity study showing end-effector error scales roughly 1:1 with anchor
  measurement error, setting a ~1 cm ceiling-anchor tolerance to hit 1–2 cm grab accuracy.
- Architected the perception and control stack: YOLO-World open-vocabulary detection maps camera
  pixels to floor coordinates and feeds a scan/grab/deliver state machine with geofenced
  no-go zones, driving an Arduino + 4× DRV8825 winch controller and a WiFi ESP32 end effector.
- Specified a complete bill of materials to a ~$230 build cost, sizing each purchased part from
  the analysis (motor torque from the tension map, 50 lb Dyneema line at ~15× load margin,
  supply wattage from total draw).

## Shorter 3-bullet version (if space is tight)

- Designed a ceiling-mounted cable-driven parallel robot that positions a gripper from four winch
  cables, deriving the inverse kinematics mapping (x, y, z) targets to four spool lengths.
- Built a closed-form cable-statics model to size NEMA 17 steppers to 2.6× worst-case tension
  (3.3× motor headroom) and verify a 4 kg workspace-wide payload; specified the full ~$230 BOM.
- Modeled eight parametric 3D-printed parts in CadQuery, including a five-finger tendon-driven
  TPU gripper, and architected a YOLO-World perception + state-machine control stack on an
  Arduino/ESP32 platform.

## Suggested skills to add to the résumé skills line
CadQuery · Python · Inverse kinematics · Statics / force analysis · YOLO-World (computer vision)
· Arduino · ESP32 · Stepper motor control · 3D printing (TPU/PETG) · BOM development
