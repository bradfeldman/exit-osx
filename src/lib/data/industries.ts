// ICB (Industry Classification Benchmark) hierarchy for Exit OSx
// Simplified structure focusing on SMB-relevant industries

export interface IndustryOption {
  value: string
  label: string
}

export interface IndustryHierarchy {
  industries: IndustryOption[]
  superSectors: Record<string, IndustryOption[]>
  sectors: Record<string, IndustryOption[]>
  subSectors: Record<string, IndustryOption[]>
}

export const industryData: IndustryHierarchy = {
  industries: [
    { value: 'TECHNOLOGY', label: 'Technology' },
    { value: 'HEALTHCARE', label: 'Healthcare' },
    { value: 'CONSUMER_DISCRETIONARY', label: 'Consumer Discretionary' },
    { value: 'CONSUMER_STAPLES', label: 'Consumer Staples' },
    { value: 'INDUSTRIALS', label: 'Industrials' },
    { value: 'FINANCIALS', label: 'Financials' },
    { value: 'REAL_ESTATE', label: 'Real Estate' },
    { value: 'UTILITIES', label: 'Utilities' },
    { value: 'BASIC_MATERIALS', label: 'Basic Materials' },
    { value: 'ENERGY', label: 'Energy' },
    { value: 'TELECOMMUNICATIONS', label: 'Telecommunications' },
  ],
  superSectors: {
    TECHNOLOGY: [
      { value: 'SOFTWARE_SERVICES', label: 'Software & Computer Services' },
      { value: 'TECH_HARDWARE', label: 'Technology Hardware & Equipment' },
    ],
    HEALTHCARE: [
      { value: 'HEALTHCARE_PROVIDERS', label: 'Healthcare Providers' },
      { value: 'MEDICAL_EQUIPMENT', label: 'Medical Equipment & Services' },
      { value: 'PHARMA_BIOTECH', label: 'Pharmaceuticals & Biotechnology' },
    ],
    CONSUMER_DISCRETIONARY: [
      { value: 'RETAIL', label: 'Retail' },
      { value: 'TRAVEL_LEISURE', label: 'Travel & Leisure' },
      { value: 'MEDIA', label: 'Media' },
      { value: 'AUTOMOBILES', label: 'Automobiles & Parts' },
      { value: 'CONSUMER_PRODUCTS', label: 'Consumer Products & Services' },
    ],
    CONSUMER_STAPLES: [
      { value: 'FOOD_BEVERAGE', label: 'Food, Beverage & Tobacco' },
      { value: 'PERSONAL_HOUSEHOLD', label: 'Personal Care, Drug & Grocery' },
    ],
    INDUSTRIALS: [
      { value: 'CONSTRUCTION', label: 'Construction & Materials' },
      { value: 'INDUSTRIAL_GOODS', label: 'Industrial Goods & Services' },
      { value: 'INDUSTRIAL_TRANSPORT', label: 'Industrial Transportation' },
    ],
    FINANCIALS: [
      { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
      { value: 'INSURANCE', label: 'Insurance' },
      { value: 'BANKS', label: 'Banks' },
    ],
    REAL_ESTATE: [
      { value: 'REAL_ESTATE_SERVICES', label: 'Real Estate Investment & Services' },
    ],
    UTILITIES: [
      { value: 'UTILITIES_SERVICES', label: 'Utilities' },
    ],
    BASIC_MATERIALS: [
      { value: 'CHEMICALS', label: 'Chemicals' },
      { value: 'BASIC_RESOURCES', label: 'Basic Resources' },
    ],
    ENERGY: [
      { value: 'ENERGY_SERVICES', label: 'Energy' },
    ],
    TELECOMMUNICATIONS: [
      { value: 'TELECOM_SERVICES', label: 'Telecommunications' },
    ],
  },
  sectors: {
    SOFTWARE_SERVICES: [
      { value: 'SOFTWARE', label: 'Software' },
      { value: 'IT_SERVICES', label: 'Computer Services' },
    ],
    TECH_HARDWARE: [
      { value: 'SEMICONDUCTORS', label: 'Semiconductors' },
      { value: 'ELECTRONICS', label: 'Electronic Equipment' },
      { value: 'TECH_HARDWARE_EQUIP', label: 'Technology Hardware' },
    ],
    HEALTHCARE_PROVIDERS: [
      { value: 'HEALTH_CARE_SERVICES', label: 'Healthcare Services' },
    ],
    MEDICAL_EQUIPMENT: [
      { value: 'MEDICAL_EQUIP_SERVICES', label: 'Medical Equipment' },
      { value: 'MEDICAL_SUPPLIES', label: 'Medical Supplies' },
    ],
    PHARMA_BIOTECH: [
      { value: 'PHARMA', label: 'Pharmaceuticals' },
      { value: 'BIOTECH', label: 'Biotechnology' },
    ],
    RETAIL: [
      { value: 'GENERAL_RETAIL', label: 'General Retailers' },
      { value: 'SPECIALTY_RETAIL', label: 'Specialty Retailers' },
    ],
    TRAVEL_LEISURE: [
      { value: 'HOTELS_ENTERTAINMENT', label: 'Hotels & Entertainment' },
      { value: 'RESTAURANTS_BARS', label: 'Restaurants & Bars' },
      { value: 'TRAVEL_TOURISM', label: 'Travel & Tourism' },
    ],
    MEDIA: [
      { value: 'MEDIA_AGENCIES', label: 'Media Agencies' },
      { value: 'PUBLISHING', label: 'Publishing' },
      { value: 'BROADCASTING', label: 'Broadcasting & Entertainment' },
    ],
    AUTOMOBILES: [
      { value: 'AUTO_PARTS', label: 'Auto Parts' },
      { value: 'AUTO_RETAIL_SERVICE', label: 'Automotive Retail & Service' },
    ],
    CONSUMER_PRODUCTS: [
      { value: 'HOUSEHOLD_GOODS', label: 'Household Goods & Home Construction' },
      { value: 'LEISURE_GOODS', label: 'Leisure Goods' },
      { value: 'PERSONAL_GOODS', label: 'Personal Goods' },
    ],
    FOOD_BEVERAGE: [
      { value: 'BEVERAGES', label: 'Beverages' },
      { value: 'FOOD_PRODUCERS', label: 'Food Producers' },
    ],
    PERSONAL_HOUSEHOLD: [
      { value: 'FOOD_DRUG_RETAIL', label: 'Food & Drug Retailers' },
      { value: 'PERSONAL_PRODUCTS', label: 'Personal Products' },
    ],
    CONSTRUCTION: [
      { value: 'CONSTRUCTION_MATERIALS', label: 'Construction & Materials' },
    ],
    INDUSTRIAL_GOODS: [
      { value: 'AEROSPACE_DEFENSE', label: 'Aerospace & Defense' },
      { value: 'GENERAL_INDUSTRIALS', label: 'General Industrials' },
      { value: 'ELECTRONIC_EQUIPMENT', label: 'Electronic & Electrical Equipment' },
      { value: 'INDUSTRIAL_ENGINEERING', label: 'Industrial Engineering' },
      { value: 'INDUSTRIAL_SUPPORT', label: 'Industrial Support Services' },
    ],
    INDUSTRIAL_TRANSPORT: [
      { value: 'FREIGHT_LOGISTICS', label: 'Freight & Logistics' },
      { value: 'PASSENGER_TRANSPORT', label: 'Passenger Transportation' },
    ],
    FINANCIAL_SERVICES: [
      { value: 'INVESTMENT_SERVICES', label: 'Investment Services' },
      { value: 'MORTGAGE_FINANCE', label: 'Mortgage Finance' },
      { value: 'FINANCIAL_ADMIN', label: 'Financial Administration' },
    ],
    INSURANCE: [
      { value: 'LIFE_INSURANCE', label: 'Life Insurance' },
      { value: 'PROPERTY_INSURANCE', label: 'Property & Casualty Insurance' },
    ],
    BANKS: [
      { value: 'BANKING', label: 'Banks' },
    ],
    REAL_ESTATE_SERVICES: [
      { value: 'REAL_ESTATE_HOLDING', label: 'Real Estate Holding & Development' },
      { value: 'REAL_ESTATE_SERVICES_SEC', label: 'Real Estate Services' },
    ],
    UTILITIES_SERVICES: [
      { value: 'ELECTRICITY', label: 'Electricity' },
      { value: 'GAS_WATER', label: 'Gas, Water & Multi-utilities' },
    ],
    CHEMICALS: [
      { value: 'CHEMICALS_SECTOR', label: 'Chemicals' },
    ],
    BASIC_RESOURCES: [
      { value: 'FORESTRY_PAPER', label: 'Forestry & Paper' },
      { value: 'INDUSTRIAL_METALS', label: 'Industrial Metals & Mining' },
    ],
    ENERGY_SERVICES: [
      { value: 'OIL_GAS_COAL', label: 'Oil, Gas & Coal' },
      { value: 'ALTERNATIVE_ENERGY', label: 'Alternative Energy' },
    ],
    TELECOM_SERVICES: [
      { value: 'TELECOM_EQUIPMENT', label: 'Telecommunications Equipment' },
      { value: 'TELECOM_PROVIDERS', label: 'Telecommunications Service Providers' },
    ],
  },
  subSectors: {
    SOFTWARE: [
      { value: 'CONSUMER_SOFTWARE', label: 'Consumer Digital Services' },
      { value: 'ENTERPRISE_SOFTWARE', label: 'Enterprise Software' },
    ],
    IT_SERVICES: [
      { value: 'IT_CONSULTING', label: 'IT Consulting & Services' },
      { value: 'DATA_PROCESSING', label: 'Data Processing & Outsourced Services' },
    ],
    SEMICONDUCTORS: [
      { value: 'SEMICONDUCTORS_SUB', label: 'Semiconductors' },
    ],
    ELECTRONICS: [
      { value: 'ELECTRONIC_COMPONENTS', label: 'Electronic Components' },
      { value: 'ELECTRONIC_MANUFACTURING', label: 'Electronic Manufacturing Services' },
    ],
    TECH_HARDWARE_EQUIP: [
      { value: 'COMPUTER_HARDWARE', label: 'Computer Hardware' },
      { value: 'ELECTRONIC_OFFICE', label: 'Electronic Office Equipment' },
    ],
    HEALTH_CARE_SERVICES: [
      { value: 'HEALTHCARE_FACILITIES', label: 'Healthcare Facilities' },
      { value: 'HEALTHCARE_MANAGEMENT', label: 'Healthcare Management Services' },
    ],
    MEDICAL_EQUIP_SERVICES: [
      { value: 'MEDICAL_EQUIPMENT_SUB', label: 'Medical Equipment' },
    ],
    MEDICAL_SUPPLIES: [
      { value: 'MEDICAL_SUPPLIES_SUB', label: 'Medical Supplies' },
    ],
    PHARMA: [
      { value: 'PHARMA_SUB', label: 'Pharmaceuticals' },
    ],
    BIOTECH: [
      { value: 'BIOTECH_SUB', label: 'Biotechnology' },
    ],
    GENERAL_RETAIL: [
      { value: 'BROADLINE_RETAIL', label: 'Broadline Retailers' },
      { value: 'DISCOUNT_RETAIL', label: 'Discount Stores' },
    ],
    SPECIALTY_RETAIL: [
      { value: 'APPAREL_RETAIL', label: 'Apparel Retailers' },
      { value: 'HOME_IMPROVEMENT', label: 'Home Improvement Retail' },
      { value: 'SPECIALTY_STORES', label: 'Specialty Stores' },
    ],
    HOTELS_ENTERTAINMENT: [
      { value: 'CASINOS_GAMING', label: 'Casinos & Gaming' },
      { value: 'HOTELS_MOTELS', label: 'Hotels, Resorts & Cruise Lines' },
      { value: 'LEISURE_FACILITIES', label: 'Leisure Facilities' },
    ],
    RESTAURANTS_BARS: [
      { value: 'RESTAURANTS', label: 'Restaurants' },
    ],
    TRAVEL_TOURISM: [
      { value: 'TRAVEL_SERVICES', label: 'Travel Services' },
    ],
    MEDIA_AGENCIES: [
      { value: 'ADVERTISING', label: 'Advertising' },
      { value: 'MARKETING_PR', label: 'Marketing & PR Services' },
    ],
    PUBLISHING: [
      { value: 'PUBLISHING_SUB', label: 'Publishing' },
    ],
    BROADCASTING: [
      { value: 'BROADCASTING_SUB', label: 'Broadcasting' },
      { value: 'ENTERTAINMENT_PROD', label: 'Entertainment Production' },
    ],
    AUTO_PARTS: [
      { value: 'AUTO_PARTS_SUB', label: 'Auto Parts & Equipment' },
    ],
    AUTO_RETAIL_SERVICE: [
      { value: 'AUTO_RETAIL', label: 'Automotive Retail' },
      { value: 'AUTO_SERVICE', label: 'Auto Service & Collision Repair' },
    ],
    HOUSEHOLD_GOODS: [
      { value: 'HOME_CONSTRUCTION', label: 'Home Construction' },
      { value: 'HOME_FURNISHINGS', label: 'Home Furnishings' },
      { value: 'HOUSEHOLD_APPLIANCES', label: 'Household Appliances' },
    ],
    LEISURE_GOODS: [
      { value: 'CONSUMER_ELECTRONICS', label: 'Consumer Electronics' },
      { value: 'RECREATIONAL_PRODUCTS', label: 'Recreational Products' },
    ],
    PERSONAL_GOODS: [
      { value: 'CLOTHING_ACCESSORIES', label: 'Clothing & Accessories' },
      { value: 'FOOTWEAR', label: 'Footwear' },
    ],
    BEVERAGES: [
      { value: 'BREWERS', label: 'Brewers' },
      { value: 'DISTILLERS_VINTNERS', label: 'Distillers & Vintners' },
      { value: 'SOFT_DRINKS', label: 'Soft Drinks' },
    ],
    FOOD_PRODUCERS: [
      { value: 'AGRICULTURAL_PRODUCTS', label: 'Agricultural Products' },
      { value: 'PACKAGED_FOODS', label: 'Packaged Foods & Meats' },
    ],
    FOOD_DRUG_RETAIL: [
      { value: 'DRUG_RETAIL', label: 'Drug Retail' },
      { value: 'FOOD_DISTRIBUTORS', label: 'Food Distributors' },
      { value: 'FOOD_RETAIL', label: 'Food Retail' },
    ],
    PERSONAL_PRODUCTS: [
      { value: 'PERSONAL_PRODUCTS_SUB', label: 'Personal Products' },
    ],
    CONSTRUCTION_MATERIALS: [
      { value: 'BUILDING_PRODUCTS', label: 'Building Products' },
      { value: 'CONSTRUCTION_SERVICES', label: 'Construction & Engineering' },
      { value: 'CONSTRUCTION_MATERIALS_SUB', label: 'Construction Materials' },
    ],
    AEROSPACE_DEFENSE: [
      { value: 'AEROSPACE_DEFENSE_SUB', label: 'Aerospace & Defense' },
    ],
    GENERAL_INDUSTRIALS: [
      { value: 'DIVERSIFIED_INDUSTRIALS', label: 'Diversified Industrials' },
    ],
    ELECTRONIC_EQUIPMENT: [
      { value: 'ELECTRICAL_COMPONENTS', label: 'Electrical Components & Equipment' },
    ],
    INDUSTRIAL_ENGINEERING: [
      { value: 'HEAVY_ELECTRICAL', label: 'Heavy Electrical Equipment' },
      { value: 'INDUSTRIAL_MACHINERY', label: 'Industrial Machinery' },
    ],
    INDUSTRIAL_SUPPORT: [
      { value: 'BUSINESS_SUPPORT', label: 'Business Support Services' },
      { value: 'COMMERCIAL_PRINTING', label: 'Commercial Printing' },
      { value: 'ENVIRONMENTAL_SERVICES', label: 'Environmental & Facilities Services' },
      { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services' },
      { value: 'SECURITY_ALARM', label: 'Security & Alarm Services' },
      { value: 'STAFFING', label: 'Human Resource & Employment Services' },
    ],
    FREIGHT_LOGISTICS: [
      { value: 'AIR_FREIGHT', label: 'Air Freight & Logistics' },
      { value: 'MARINE_SHIPPING', label: 'Marine Shipping' },
      { value: 'TRUCKING', label: 'Trucking' },
    ],
    PASSENGER_TRANSPORT: [
      { value: 'AIRLINES', label: 'Airlines' },
      { value: 'RAILROADS', label: 'Railroads' },
    ],
    INVESTMENT_SERVICES: [
      { value: 'ASSET_MANAGEMENT', label: 'Asset Management' },
      { value: 'INVESTMENT_BANKING', label: 'Investment Banking & Brokerage' },
    ],
    MORTGAGE_FINANCE: [
      { value: 'MORTGAGE_FINANCE_SUB', label: 'Mortgage Finance' },
    ],
    FINANCIAL_ADMIN: [
      { value: 'FINANCIAL_DATA', label: 'Financial Data & Stock Exchanges' },
      { value: 'TRANSACTION_PROCESSING', label: 'Transaction & Payment Processing' },
    ],
    LIFE_INSURANCE: [
      { value: 'LIFE_INSURANCE_SUB', label: 'Life Insurance' },
    ],
    PROPERTY_INSURANCE: [
      { value: 'PROPERTY_CASUALTY', label: 'Property & Casualty Insurance' },
      { value: 'REINSURANCE', label: 'Reinsurance' },
    ],
    BANKING: [
      { value: 'COMMERCIAL_BANKS', label: 'Commercial Banks' },
      { value: 'COMMUNITY_BANKS', label: 'Regional & Community Banks' },
    ],
    REAL_ESTATE_HOLDING: [
      { value: 'REAL_ESTATE_DEV', label: 'Real Estate Development' },
      { value: 'REAL_ESTATE_OPERATING', label: 'Real Estate Operating Companies' },
    ],
    REAL_ESTATE_SERVICES_SEC: [
      { value: 'REAL_ESTATE_BROKERAGE', label: 'Real Estate Brokerage' },
      { value: 'PROPERTY_MANAGEMENT', label: 'Property Management' },
    ],
    ELECTRICITY: [
      { value: 'ELECTRIC_UTILITIES', label: 'Electric Utilities' },
    ],
    GAS_WATER: [
      { value: 'GAS_UTILITIES', label: 'Gas Utilities' },
      { value: 'WATER_UTILITIES', label: 'Water Utilities' },
      { value: 'MULTI_UTILITIES', label: 'Multi-Utilities' },
    ],
    CHEMICALS_SECTOR: [
      { value: 'COMMODITY_CHEMICALS', label: 'Commodity Chemicals' },
      { value: 'SPECIALTY_CHEMICALS', label: 'Specialty Chemicals' },
    ],
    FORESTRY_PAPER: [
      { value: 'FOREST_PRODUCTS', label: 'Forest Products' },
      { value: 'PAPER_PRODUCTS', label: 'Paper Products' },
    ],
    INDUSTRIAL_METALS: [
      { value: 'ALUMINUM', label: 'Aluminum' },
      { value: 'STEEL', label: 'Steel' },
    ],
    OIL_GAS_COAL: [
      { value: 'INTEGRATED_OIL', label: 'Integrated Oil & Gas' },
      { value: 'OIL_GAS_EXPLORATION', label: 'Oil & Gas Exploration & Production' },
      { value: 'OIL_GAS_SERVICES', label: 'Oil & Gas Equipment & Services' },
    ],
    ALTERNATIVE_ENERGY: [
      { value: 'RENEWABLE_ENERGY', label: 'Renewable Energy' },
    ],
    TELECOM_EQUIPMENT: [
      { value: 'TELECOM_EQUIPMENT_SUB', label: 'Telecommunications Equipment' },
    ],
    TELECOM_PROVIDERS: [
      { value: 'INTEGRATED_TELECOM', label: 'Integrated Telecommunication Services' },
      { value: 'WIRELESS_TELECOM', label: 'Wireless Telecommunication Services' },
    ],
  },
}

export function getIndustryLabel(hierarchy: IndustryHierarchy, level: keyof IndustryHierarchy, value: string): string {
  if (level === 'industries') {
    return hierarchy.industries.find(i => i.value === value)?.label || value
  }

  // For nested levels, search all options
  const allOptions = Object.values(hierarchy[level]).flat()
  return allOptions.find(o => o.value === value)?.label || value
}

// Flattened industry option with full hierarchy
export interface FlattenedIndustryOption {
  // Values for each level
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  // Labels for each level
  industryLabel: string
  superSectorLabel: string
  sectorLabel: string
  subSectorLabel: string
  // Full path for display
  fullPath: string
  // Search-friendly string
  searchString: string
}

// Generate all flattened industry options with full paths
export function getFlattenedIndustryOptions(): FlattenedIndustryOption[] {
  const options: FlattenedIndustryOption[] = []

  for (const industry of industryData.industries) {
    const superSectors = industryData.superSectors[industry.value] || []

    for (const superSector of superSectors) {
      const sectors = industryData.sectors[superSector.value] || []

      for (const sector of sectors) {
        const subSectors = industryData.subSectors[sector.value] || []

        for (const subSector of subSectors) {
          const fullPath = `${industry.label} > ${superSector.label} > ${sector.label} > ${subSector.label}`
          const searchString = `${industry.label} ${superSector.label} ${sector.label} ${subSector.label}`.toLowerCase()

          options.push({
            icbIndustry: industry.value,
            icbSuperSector: superSector.value,
            icbSector: sector.value,
            icbSubSector: subSector.value,
            industryLabel: industry.label,
            superSectorLabel: superSector.label,
            sectorLabel: sector.label,
            subSectorLabel: subSector.label,
            fullPath,
            searchString,
          })
        }
      }
    }
  }

  return options
}

// Get a specific flattened option by sub-sector value
export function getFlattenedOptionBySubSector(subSectorValue: string): FlattenedIndustryOption | undefined {
  return getFlattenedIndustryOptions().find(opt => opt.icbSubSector === subSectorValue)
}
