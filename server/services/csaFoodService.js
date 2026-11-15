/**
 * Curated Canadian Space Agency (CSA) Controlled-Environment Agriculture (CEA)
 * & Food Production in Space and Remote Areas reference data for Sol 1 & Sol 4.
 */
export function getCsaFoodProductionData() {
    return {
        agency: "Canadian Space Agency (CSA)",
        resourcePackage: "Food Production on the Moon and in Remote Areas",
        referenceUrl: "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/",
        solApplications: {
            sol1: {
                mission: "Sol 1: Space-Tomato Greenhouse",
                principle: "Closed-Loop Hydroponic Water & Nutrient Recycling",
                summary: "Inspired by CSA space-plant studies and Tomatosphere, recirculating hydroponics minimizes water loss while producing fresh micronutrients and scrubbing crew CO2."
            },
            sol4: {
                mission: "Sol 4: Air, Ice & LED Potatoes",
                principle: "Tuned Red/Blue LED Spectrum & Power Sequencing",
                summary: "CSA controlled-environment agriculture demonstrates that tailoring red (60-75%) and blue (25-40%) LED wavelengths maximizes photosynthesis while reducing electrical demand.",
                earthBenefit: "The same closed-loop LED greenhouse technologies enable remote northern and Arctic communities on Earth to grow fresh produce year-round."
            }
        },
        optimalLedTargets: {
            redPercentRange: [60, 75],
            bluePercentRange: [25, 40],
            requiresLiquidWaterFirst: true
        }
    };
}