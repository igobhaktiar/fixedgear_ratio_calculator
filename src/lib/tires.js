import { etrtoCircumference } from './gearing.js';

const tire = (id, label, bead, width) => ({
  id,
  label,
  etrto: `${width}-${bead}`,
  circumference: etrtoCircumference(bead, width),
});

export const TIRES = [
  tire('700x23', '700 × 23C', 622, 23),
  tire('700x25', '700 × 25C', 622, 25),
  tire('700x28', '700 × 28C', 622, 28),
  tire('700x32', '700 × 32C', 622, 32),
  tire('700x35', '700 × 35C', 622, 35),
  tire('650bx47', '650B × 47', 584, 47),
  tire('26x150', '26 × 1.50', 559, 38),
  tire('26x195', '26 × 1.95', 559, 50),
  tire('24x175', '24 × 1.75 (BMX-ish)', 507, 44),
];

export const CUSTOM_TIRE_ID = 'custom';

export const findTire = (id) => TIRES.find((t) => t.id === id);
