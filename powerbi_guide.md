# Power BI Desktop Implementation Guide

This guide details how to recreate the **Business Data Analytics for Sales Performance & Customer Insights** dashboard inside **Power BI Desktop**. This documentation is tailored for an internship final submission and presentation.

---

## Step 1: Ingesting the Dataset

1. Open **Power BI Desktop**.
2. Click on **Get Data** (Home tab) and select **Text/CSV**.
3. Locate and select the generated [sales_data.csv](file:///c:/Users/Lakshmi/Desktop/bussiness%20analysis/sales_data.csv).
4. Review the preview in the dialog box. Ensure the encoding is set to **UTF-8** and the delimiter is **Comma**.
5. Click **Transform Data** to open the **Power Query Editor**.

### Data Type Configurations in Power Query:
In the Power Query Editor, verify that the column types are correctly mapped. If not, right-click the header and select **Change Type**:
* `Order_ID`: **Text**
* `Order_Date`: **Date** (If formatted as text, change to Date using Locale: English (United States))
* `Customer_ID`: **Text**
* `Customer_Name`: **Text**
* `Category`: **Text**
* `Product_Name`: **Text**
* `Region`: **Text**
* `State`: **Text**
* `City`: **Text**
* `Quantity`: **Whole Number**
* `Sales_Amount`: **Decimal Number**
* `Profit`: **Decimal Number**
* `Payment_Mode`: **Text**

Click **Close & Apply** in the top left to load the data into the model.

---

## Step 2: Creating the Date/Calendar Dimension Table (Best Practice)

For reliable time-series modeling (like monthly trends), it is standard practice to create a dedicated Calendar table.

1. Click on the **Model View** or **Data View** tab.
2. Select **New Table** from the Home tab.
3. Paste the following DAX formula:
   ```dax
   Calendar = 
   ADDCOLUMNS(
       CALENDAR(MIN(sales_data[Order_Date]), MAX(sales_data[Order_Date])),
       "Year", YEAR([Date]),
       "Month Number", MONTH([Date]),
       "Month Name", FORMAT([Date], "MMMM"),
       "Month Year", FORMAT([Date], "YYYY-MM"),
       "Quarter", "Q" & FORMAT([Date], "Q"),
       "Day of Week", FORMAT([Date], "dddd")
   )
   ```
4. **Sort Month Name**: In Data View, select the `Month Name` column, click **Sort by column** (Column Tools tab), and select `Month Number`. This ensures months sort chronologically rather than alphabetically in charts.
5. **Establish Relationship**:
   * Navigate to the **Model View** tab.
   * Drag the `Date` column from the `Calendar` table to the `Order_Date` column in the `sales_data` table to create a `1-to-many (1:*)` active relationship.

---

## Step 3: DAX Calculated Columns (Customer Insights)

To implement Customer Segmentation and Loyalty Types, create these calculated columns inside the main `sales_data` table.

1. In the Fields pane, click the three dots next to `sales_data` and select **New Column**.

### Column 1: Customer Total Spend
This calculates the lifetime spend for each customer.
```dax
Customer_Total_Spend = 
CALCULATE(
    SUM(sales_data[Sales_Amount]),
    ALLEXCEPT(sales_data, sales_data[Customer_ID])
)
```

### Column 2: Customer Segment
Categorizes customers into spending tiers matching the Web Dashboard logic.
```dax
Customer_Segment = 
IF(
    sales_data[Customer_Total_Spend] >= 5000,
    "High Value",
    IF(
        sales_data[Customer_Total_Spend] >= 2000,
        "Medium Value",
        "Low Value"
    )
)
```

### Column 3: Order Count Per Customer
Determines how many distinct orders a client has placed.
```dax
Customer_Order_Count = 
CALCULATE(
    DISTINCTCOUNT(sales_data[Order_ID]),
    ALLEXCEPT(sales_data, sales_data[Customer_ID])
)
```

### Column 4: Loyalty Type
Classifies users as Repeat vs One-Time.
```dax
Loyalty_Type = 
IF(
    sales_data[Customer_Order_Count] > 1,
    "Repeat (2+ Orders)",
    "One-Time (1 Order)"
)
```

---

## Step 4: Core Key Performance Indicator (KPI) Measures

Create a dedicated measures table to keep calculations organized.
1. Click **Enter Data** (Home tab), name the table `_Measures Table`, and click **Load**.
2. Select `_Measures Table` and click **New Measure** to enter each of the following:

### Measure 1: Total Sales
```dax
Total Sales = SUM(sales_data[Sales_Amount])
```
*Format: Currency ($) with 2 decimal places.*

### Measure 2: Total Profit
```dax
Total Profit = SUM(sales_data[Profit])
```
*Format: Currency ($) with 2 decimal places.*

### Measure 3: Total Orders
```dax
Total Orders = DISTINCTCOUNT(sales_data[Order_ID])
```
*Format: Whole Number with thousands separator.*

### Measure 4: Total Customers
```dax
Total Customers = DISTINCTCOUNT(sales_data[Customer_ID])
```
*Format: Whole Number.*

### Measure 5: Profit Margin (%)
```dax
Profit Margin = DIVIDE([Total Profit], [Total Sales], 0)
```
*Format: Percentage (%) with 1 decimal place.*

### Measure 6: Average Order Value (AOV)
```dax
Average Order Value = DIVIDE([Total Sales], [Total Orders], 0)
```
*Format: Currency ($) with 2 decimal places.*

---

## Step 5: Dashboard Visual Configuration Guide

### Color Palette Theme Values:
To match the clean corporate look, customize your Power BI report theme colors (View -> Customize Current Theme):
* **Primary (Deep Blue)**: `#1A365D`
* **Secondary (Bright Blue)**: `#2B6CB0`
* **Accent (Teal)**: `#319795`
* **Neutral Dark**: `#2D3748`
* **Neutral Light**: `#F7FAFC`

---

### PAGE 1: OVERVIEW DASHBOARD

1. **KPI Cards (New Card Visual)**:
   * Fields: `[Total Sales]`, `[Total Profit]`, `[Total Orders]`, `[Total Customers]`.
   * Formatting: Turn on Shadow. Set Font to **Segoe UI Semibold** (or **Inter** if installed). Include secondary label measures (e.g., show `[Profit Margin]` under `[Total Profit]`).
2. **Sales Trend over Time (Line Chart)**:
   * **X-Axis**: `Calendar[Month Year]`
   * **Y-Axis**: `[Total Sales]`
   * **Format**: Smooth lines, line color: `#2B6CB0`.
3. **Profit vs. Sales (Line and Clustered Column Chart)**:
   * **Shared X-Axis**: `Calendar[Month Year]`
   * **Column Y-Axis**: `[Total Sales]`
   * **Line Y-Axis**: `[Profit Margin]`
   * **Format**: Right-side Y-axis for margin percentage; columns colored `#2B6CB0`, line colored `#319795`.

---

### PAGE 2: SALES ANALYSIS PAGE

1. **Sales by Category (Clustered Bar Chart)**:
   * **Y-Axis**: `sales_data[Category]`
   * **X-Axis**: `[Total Sales]`
   * **Format**: Data labels turned on, bars colored in a gradient or matching categories.
2. **Sales by Region (Clustered Column Chart)**:
   * **X-Axis**: `sales_data[Region]`
   * **Y-Axis**: `[Total Sales]`
   * **Format**: Colored `#319795`.
3. **Top 10 Products by Sales (Clustered Column Chart)**:
   * **X-Axis**: `sales_data[Product_Name]`
   * **Y-Axis**: `[Total Sales]`
   * **Filter (Filters Pane)**: Apply a Top N filter on `Product_Name` -> Top 10 by value `[Total Sales]`.
4. **Monthly Sales Trend (Area Chart)**:
   * **X-Axis**: `Calendar[Month Year]`
   * **Y-Axis**: `[Total Sales]`
   * **Format**: Filled translucent area below the line (`#DD6B20`).

---

### PAGE 3: CUSTOMER INSIGHTS PAGE

1. **Top Customers by Purchase Value (Table)**:
   * **Columns**: `sales_data[Customer_ID]`, `sales_data[Customer_Name]`, `[Total Orders]`, `[Total Sales]`, `[Total Profit]`, `sales_data[Customer_Segment]`.
   * **Format**: Sort by `[Total Sales]` descending. Apply conditional formatting data bars to the `[Total Sales]` column.
2. **Customer Segmentation (Donut Chart)**:
   * **Legend**: `sales_data[Customer_Segment]`
   * **Values**: Count of `sales_data[Customer_ID]` (Distinct) or a new measure.
   * **Format**: Slices colored: High Value (`#319795`), Medium Value (`#2B6CB0`), Low Value (`#805AD5`).
3. **Repeat vs One-time Customers (Pie Chart)**:
   * **Legend**: `sales_data[Loyalty_Type]`
   * **Values**: Count of `sales_data[Customer_ID]` (Distinct).

---

### PAGE 4: PRODUCT PERFORMANCE PAGE

1. **Best & Least Performing Products (Two separate Tables)**:
   * **Table 1 (Best)**: `sales_data[Product_Name]`, `sales_data[Category]`, Sum of `Quantity`, `[Total Sales]`, `[Profit Margin]`. Apply Filters pane: Top 5 by `[Total Sales]`.
   * **Table 2 (Worst)**: Same columns. Apply Filters pane: Bottom 5 by `[Total Sales]`.
2. **Category Contribution (Pie Chart)**:
   * **Legend**: `sales_data[Category]`
   * **Values**: Sum of `sales_data[Quantity]`
3. **Key Business Insights (Text Box)**:
   * Add a rich text box with cards or bullet points reflecting:
     * *Best Category*: **Technology**
     * *Highest Revenue Month*: Peak Q4 month (e.g. **November 2024 / November 2025**)
     * *Top Customer Segment*: Count segment distribution
     * *Region with Highest Sales*: **West**

---

### PAGE 5: INTERACTIVE FILTERS (SLICERS)

Place these slicers in a unified panel (either on the top or left margin of every page):
1. **Date Slicer**: `Calendar[Date]` set as **Between** slider.
2. **Region Slicer**: `sales_data[Region]` set as **Dropdown**.
3. **Category Slicer**: `sales_data[Category]` set as **Tile/Button** or **Dropdown**.
4. **Customer Slicer**: `sales_data[Customer_Name]` set as **Dropdown** with search enabled.
