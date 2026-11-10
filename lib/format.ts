const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const formatINR = (rupees: number) => inr.format(rupees);
/** rupees -> integer paise, rounding half away from zero on the second decimal */
export const toPaise = (rupees: number) => Math.round(rupees * 100);
