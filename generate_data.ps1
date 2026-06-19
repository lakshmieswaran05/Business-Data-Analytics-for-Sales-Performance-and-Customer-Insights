# Catalog definitions
$Categories = @{
    "Technology" = @{
        "Products" = @{
            "iPhone 15 Pro" = @(999.00, 0.25)
            "Samsung Galaxy S24" = @(899.00, 0.22)
            "MacBook Air M3" = @(1099.00, 0.28)
            "Dell XPS 13" = @(999.00, 0.20)
            "Logitech MX Master 3S" = @(99.00, 0.35)
            "Mechanical Keyboard" = @(120.00, 0.30)
            "USB-C Docking Station" = @(80.00, 0.40)
        }
    }
    "Office Supplies" = @{
        "Products" = @{
            "Premium A4 Copy Paper" = @(15.00, 0.50)
            "Leather Binder Organizer" = @(35.00, 0.45)
            "Gel Pen Pack (12 Qty)" = @(12.00, 0.60)
            "Ergonomic Footrest" = @(45.00, 0.30)
            "Dry Erase Whiteboard" = @(65.00, 0.35)
            "Heavy Duty Stapler" = @(25.00, 0.40)
            "Desktop File Organizer" = @(20.00, 0.50)
        }
    }
    "Furniture" = @{
        "Products" = @{
            "Ergonomic Office Chair" = @(249.00, 0.15)
            "Electric Standing Desk" = @(399.00, 0.12)
            "Wooden Writing Desk" = @(299.00, 0.14)
            "LED Desk Lamp with Qi Charger" = @(49.00, 0.25)
            "3-Drawer Mobile File Cabinet" = @(149.00, 0.18)
            "Bookshelf (5-Tier)" = @(119.00, 0.16)
        }
    }
}

$Regions = @{
    "East" = @(
        @("New York", "New York City"),
        @("New York", "Buffalo"),
        @("Massachusetts", "Boston"),
        @("Pennsylvania", "Philadelphia")
    )
    "West" = @(
        @("California", "Los Angeles"),
        @("California", "San Francisco"),
        @("California", "San Diego"),
        @("Washington", "Seattle"),
        @("Oregon", "Portland")
    )
    "Central" = @(
        @("Illinois", "Chicago"),
        @("Texas", "Houston"),
        @("Texas", "Austin"),
        @("Texas", "Dallas"),
        @("Ohio", "Cleveland")
    )
    "South" = @(
        @("Florida", "Miami"),
        @("Florida", "Orlando"),
        @("Georgia", "Atlanta"),
        @("North Carolina", "Charlotte")
    )
}

$PaymentModes = @("Credit Card", "Debit Card", "UPI", "Net Banking", "Cash on Delivery")

# Customer Pool
$FirstNames = @("John", "Jane", "Robert", "Emily", "Michael", "Sarah", "David", "Jessica", "James", "Ashley", "William", "Amanda", "Joseph", "Melissa", "Charles", "Stephanie", "Thomas", "Nicole", "Daniel", "Elizabeth", "Matthew", "Courtney", "Donald", "Amber", "Mark", "Megan", "Paul", "Rachel", "Steven", "Laura")
$LastNames = @("Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson")

# Instantiate randomizer
$Rand = New-Object System.Random

$Customers = @()
for ($i = 0; $i -lt 100; $i++) {
    $fn = $FirstNames[(Get-Random -Maximum $FirstNames.Count)]
    $ln = $LastNames[(Get-Random -Maximum $LastNames.Count)]
    $cust_id = "CUST-$(1000 + $i)"
    $cust_name = "$fn $ln"
    $Customers += [PSCustomObject]@{
        ID = $cust_id
        Name = $cust_name
    }
}

$StartDate = [datetime]"2024-01-01"
$EndDate = [datetime]"2026-05-31"
$DateRangeDays = ($EndDate - $StartDate).Days

$Data = @()
$OrderCounter = 10000

for ($i = 0; $i -lt 1100; $i++) {
    $OrderCounter++
    $OrderID = "ORD-$OrderCounter"
    
    # Date generation
    $DayOffset = Get-Random -Minimum 0 -Maximum $DateRangeDays
    $OrderDate = $StartDate.AddDays($DayOffset)
    
    # Seasonality boost for Q4
    if ($OrderDate.Month -in @(10, 11, 12)) {
        if ($Rand.NextDouble() -lt 0.35) {
            $DayOffset = Get-Random -Minimum 0 -Maximum $DateRangeDays
            $OrderDate = $StartDate.AddDays($DayOffset)
        }
    }
    
    # Customer Selection (Skewed index using powers of double values)
    $RandVal = [Math]::Pow($Rand.NextDouble(), 2.2)
    $CustIdx = [Math]::Floor($RandVal * $Customers.Count)
    if ($CustIdx -ge $Customers.Count) { $CustIdx = $Customers.Count - 1 }
    $Customer = $Customers[$CustIdx]
    
    # Category Selection
    $CatRoll = $Rand.NextDouble()
    if ($CatRoll -lt 0.40) {
        $Category = "Technology"
    } elseif ($CatRoll -lt 0.75) {
        $Category = "Office Supplies"
    } else {
        $Category = "Furniture"
    }
    
    # Product selection
    $ProdKeys = @($Categories[$Category]["Products"].Keys)
    $ProductName = $ProdKeys[(Get-Random -Maximum $ProdKeys.Count)]
    $PriceMargin = $Categories[$Category]["Products"][$ProductName]
    $UnitPrice = $PriceMargin[0]
    $Margin = $PriceMargin[1]
    
    # Quantity selection
    if ($Category -eq "Technology") {
        $QtyRoll = $Rand.NextDouble()
        if ($QtyRoll -lt 0.80) { $Quantity = 1 }
        elseif ($QtyRoll -lt 0.95) { $Quantity = 2 }
        else { $Quantity = 3 }
    } elseif ($Category -eq "Office Supplies") {
        $Quantity = Get-Random -Minimum 1 -Maximum 11
    } else {
        $QtyRoll = $Rand.NextDouble()
        if ($QtyRoll -lt 0.70) { $Quantity = 1 }
        elseif ($QtyRoll -lt 0.90) { $Quantity = 2 }
        else { $Quantity = 4 }
    }
    
    # Discount
    $Discount = 0.0
    if ($Rand.NextDouble() -lt 0.25) {
        # Random between 0.05 and 0.15
        $Discount = [Math]::Round(($Rand.NextDouble() * 0.10 + 0.05), 2)
    }
    
    $SalesAmount = [Math]::Round(($UnitPrice * $Quantity) * (1 - $Discount), 2)
    
    # Shipping overhead for Furniture
    $ShippingCost = 0.0
    if ($Category -eq "Furniture") {
        $ShippingCost = [Math]::Round($SalesAmount * ($Rand.NextDouble() * 0.04 + 0.02), 2)
    }
    
    $Profit = [Math]::Round(($SalesAmount * $Margin) - $ShippingCost, 2)
    
    # Geography
    $RegionRoll = $Rand.NextDouble()
    if ($RegionRoll -lt 0.35) { $Region = "West" }
    elseif ($RegionRoll -lt 0.65) { $Region = "East" }
    elseif ($RegionRoll -lt 0.85) { $Region = "Central" }
    else { $Region = "South" }
    
    $Cities = $Regions[$Region]
    $CityState = $Cities[(Get-Random -Maximum $Cities.Count)]
    $State = $CityState[0]
    $City = $CityState[1]
    
    $PaymentMode = $PaymentModes[(Get-Random -Maximum $PaymentModes.Count)]
    
    $Data += [PSCustomObject]@{
        Order_ID      = $OrderID
        Order_Date    = $OrderDate.ToString("yyyy-MM-dd")
        Customer_ID   = $Customer.ID
        Customer_Name = $Customer.Name
        Category      = $Category
        Product_Name  = $ProductName
        Region        = $Region
        State         = $State
        City          = $City
        Quantity      = $Quantity
        Sales_Amount  = $SalesAmount
        Profit        = $Profit
        Payment_Mode  = $PaymentMode
    }
}

# Export to CSV
$Data | Export-Csv -Path "sales_data.csv" -NoTypeInformation -Encoding utf8
Write-Host "Dataset successfully generated with $($Data.Count) records without errors!"
