# USER GUIDE
## PATTERN DEVELOPMENT REQUEST MANAGEMENT SYSTEM (TCC TEMPLATE REQUEST)

![TraxEco Logo](user_guide_images/logo.png)

**TRAXECO GROUP — TCC TEMPLATE DIVISION**  
*Version: 1.4.0 | Last Updated: 2026-06-20*

---

<div class="toc-page-wrapper">
  <div class="toc-container" style="page-break-inside: avoid;">
    <h2>TABLE OF CONTENTS</h2>
    <div class="toc-line"></div>
    <ul class="toc-list">
      <li>
        <a href="#1-general-business-process">1. General Business Process</a>
        <span class="toc-page">Page 3</span>
      </li>
      <li>
        <a href="#2-tasks-for-requestors">2. Tasks for Requestors</a>
        <span class="toc-page">Page 3</span>
      </li>
      <li class="toc-subitem">
        <a href="#task-21-register-a-new-pattern-request-create-new">• Register a New Pattern Request (Create New)</a>
      </li>
      <li class="toc-subitem">
        <a href="#task-22-track-progress--update-material-sent-date">• Track Progress & Update Material Sent Date</a>
      </li>
      <li>
        <a href="#3-tasks-for-tcc-technical-department-adminpattern-maker">3. Tasks for TCC Technical Department (Admin/Pattern Maker)</a>
        <span class="toc-page">Page 5</span>
      </li>
      <li class="toc-subitem">
        <a href="#task-31-update-progress--assign-pattern-maker">• Update Progress & Assign Pattern Maker</a>
      </li>
      <li class="toc-subitem">
        <a href="#task-32-release-finished-patterns-release">• Release Finished Patterns (Release)</a>
      </li>
      <li>
        <a href="#4-performance-monitoring-and-analytics-dashboard">4. Performance Monitoring and Analytics (Dashboard)</a>
        <span class="toc-page">Page 6</span>
      </li>
      <li>
        <a href="#5-advanced-features--help">5. Advanced Features & Help</a>
        <span class="toc-page">Page 8</span>
      </li>
    </ul>
  </div>
</div>

<div class="page-break"></div>

## 1. General Business Process

The system manages the state of each pattern development request according to the following workflow:

```mermaid
graph TD
    A["NEW REQUEST<br>(Status: Not Started)"] --> B["MATERIAL RECEIVED<br>(Status: Work in Progress)"]
    B --> C["PATTERN DESIGNING<br>(Status: Work in Progress)"]
    C --> D["PATTERN FINISHED<br>(Status: Finished)"]
    D --> E["RELEASE TO FACTORY<br>(Status: Released)"]
    
    C -.->|Technical Defect / Remake| F["REMAKE PATTERN<br>(Status: Remake)"]
    F --> C
```

## 2. Tasks for Requestors

### Task 2.1: Register a New Pattern Request (Create New)

To send a new pattern development request to the TCC technical department, follow these steps:

1. **Access the Request Page**: From the left navigation menu, click **Template Request**.  
   <img src="user_guide_images/en/step_nav_tracking.png" style="max-width: 300px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);" />
2. **Open the Registration Form**: Click **Add New** at the top right of the screen. The registration form drawer will slide in from the right.  
   <img src="user_guide_images/en/step_add_btn.png" style="max-width: 600px; width: 100%; width: 100%; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);" />
3. **Select Customer & Enter General Info**:
   * Select **Customer** from the dropdown suggestions:  
     <img src="user_guide_images/en/step_customer_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Enter **Season** information (e.g., *SS26*, *FW26*):  
     <img src="user_guide_images/en/step_season_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Enter **Style No** exactly as specified in the style tech pack:  
     <img src="user_guide_images/en/step_style_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Enter **Product Type** (e.g., *Jacket*, *Pants*):  
     <img src="user_guide_images/en/step_product_type_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
4. **Enter Technical Details**:
   * Select **Sample Stage** (e.g., *01 - 1st Proto*, *07 - Size Set*):  
     <img src="user_guide_images/en/step_sample_stage_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Select the target **Factory** for sample manufacturing:  
     <img src="user_guide_images/en/step_factory_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Select the date materials are sent using the datepicker at **Material Sent Date**:  
     <img src="user_guide_images/en/step_material_sent_datepicker.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Select the process complexity at **Process Type**:  
     <img src="user_guide_images/en/step_process_type_select.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
5. **Configure Machine & Size parameters**:
   * Enter a detailed **Operation Description**:  
     <img src="user_guide_images/en/step_operation_desc_textarea.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Fill in the **Machine Type** to be used:  
     <img src="user_guide_images/en/step_machine_type_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Fill in the **Machine Dimension**:  
     <img src="user_guide_images/en/step_machine_dimension_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Fill in the **Sizes Required** (e.g., *S, M, L*):  
     <img src="user_guide_images/en/step_sizes_required_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Enter the **Line Quantity** (number of pattern pieces requested):  
     <img src="user_guide_images/en/step_line_quantity_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Select the requested **Expected Delivery Date**:  
     <img src="user_guide_images/en/step_expected_delivery_datepicker.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
6. **Handle Urgent Requests (Priority)**:
   * If the request is urgent, set **Is Priority** to Yes:  
     <img src="user_guide_images/en/step_is_priority_select.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Once set to Yes, it is mandatory to specify a clear **Priority Reason** in the input field that appears below:  
     <img src="user_guide_images/en/step_priority_reason_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
7. **Submit Request**: Click **Submit** at the bottom of the drawer. The request will appear instantly on the tracking grid.  
   <img src="user_guide_images/en/step_submit_btn.png" style="max-width: 400px; width: 100%; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />

---

### Task 2.2: Track Progress & Update Material Sent Date

1. **Search for Style No**: Enter the customer name in the quick search bar, or use the filter buttons to narrow down the tracking list:  
   <img src="user_guide_images/en/step_filter_bar.png" style="max-width: 900px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Click **Filter** or **Load Data** to retrieve and filter requests:  
     <div style="display: flex; gap: 12px; margin-top: 8px; margin-bottom: 8px;">
       <img src="user_guide_images/en/step_filter_btn.png" style="max-width: 400px; width: 100%; width: 100%; border: 1px solid #cbd5e1; border-radius: 6px;" />
       <img src="user_guide_images/en/step_load_data_btn.png" style="max-width: 400px; width: 100%; width: 100%; border: 1px solid #cbd5e1; border-radius: 6px;" />
     </div>
   * Click the **Filter** button to slide open the **Advanced Filter** panel on the right side of the screen for multi-criteria filtering:  
     <img src="user_guide_images/en/step_filter_drawer.png" style="max-width: 600px; width: 100%; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
2. **Monitor Request Status**: Track the **Status** column on the grid to inspect progress made by the TCC technical team:  
   <img src="user_guide_images/en/step_status_chip.png" style="max-width: 600px; width: 100%; width: 100%; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
3. **Quick Edit Material Sent Date**:
   * Hover over the row you want to update and double-click or click the edit pencil icon in the **Material Sent Date** column cell:  
     <img src="user_guide_images/en/step_inline_edit_trigger.png" style="max-width: 500px; width: 100%; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * A datepicker dialog will pop up. Choose the correct sent date and click Save to apply changes directly on the grid:  
     <img src="user_guide_images/en/step_inline_edit_datepicker.png" style="max-width: 500px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />

> [!NOTE]
> The inline quick-edit functionality for Material Sent Date is only available if your user account is authorized with editing permissions.

<div class="page-break"></div>

## 3. Tasks for TCC Technical Department (Admin/Pattern Maker)

### Task 3.1: Update Progress & Assign Pattern Maker

Upon receiving sample materials or assigning a technician to create the pattern, follow these steps:

1. **Access the Master Data Page**: From the left navigation menu, click **Master Data**.  
   <img src="user_guide_images/en/step_nav_admin.png" style="max-width: 300px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
2. **Open the Detail View Drawer**: Double-click the request row on the grid. The detail view drawer will slide in from the right. The left panel shows the original request information submitted by requestors in read-only format:  
   <img src="user_guide_images/en/step_admin_details.png" style="max-width: 750px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
3. **Update Material Receipt Info**:
   * Select the **Material Received Date** using the calendar picker tool:  
     <img src="user_guide_images/en/step_material_received_datepicker.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Select the technician assigned to design the pattern in the **Developer Name** field:  
     <img src="user_guide_images/en/step_developer_name_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
4. **Update Status & Working Dates**:
   * When beginning the design process: Change **Status** to **Work in Progress**:  
     <img src="user_guide_images/en/step_status_select.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
     Also select the actual **Start Date**:  
     <img src="user_guide_images/en/step_start_datepicker.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * When pattern design is complete: Change status to **Finished** and select the actual **Finished Date**:  
     <img src="user_guide_images/en/step_finished_datepicker.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
     It is also mandatory to enter the number of designed pattern pieces in the **Template Qty** field:  
     <img src="user_guide_images/en/step_template_qty_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
5. **Log Delay or Remake Reasons**:
   * If the actual finished date is past the requested expected delivery date, it is mandatory to specify or choose a reason in the **Delay/Remake Reason** field:  
     <img src="user_guide_images/en/step_delay_remake_reason_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * Log any extra information or remarks in the **Remarks** field:  
     <img src="user_guide_images/en/step_remarks_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 6px; border: 1px solid #cbd5e1; border-radius: 6px;" />
6. **Save Progress**: Click **Save** at the bottom of the form.  
   <img src="user_guide_images/en/step_save_btn.png" style="max-width: 400px; width: 100%; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * The system will automatically compute and display the **Last Updated By** and **Last Updated At** audit logs at the bottom left corner of the drawer to record edits:  
     <img src="user_guide_images/en/step_audit_log_info.png" style="max-width: 600px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />

---

### Task 3.2: Release Finished Patterns (Release)

When pattern drawings have been audited and passed technical checks, and the pattern is handed over to the factory workshops for bulk production:

1. **Open the Detail Drawer** of the request which must be in **Finished** status.
2. **Trigger Pattern Release**: Click **Release** at the bottom right corner of the update form:  
   <img src="user_guide_images/en/step_release_btn.png" style="max-width: 600px; width: 100%; width: 100%; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
3. **Confirm Data Lock**: The system will automatically record the release time in the **Released Date** field and update the request status to **Released**. At this point, the update form will be completely locked (read-only) to protect data integrity.  
   <img src="user_guide_images/en/step_released_date_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />

> [!IMPORTANT]
> Once the **Release** action is executed, the request record is locked permanently. No further modifications are allowed to ensure statistic and tracking reports remain strictly accurate.

<div class="page-break"></div>

## 4. Performance Monitoring and Analytics (Dashboard)

The **Dashboard** page helps managers monitor working efficiency and request processing speeds across the pattern development division in real-time.

1. **Review 8 Performance KPI Cards**: Monitor high-level metrics including total registered requests (Total Input), total finished requests (Total Output), requests currently in process (In Process) or not started (Not Started), patterns flagged for remake due to errors (Remake), the on-time completion percentage (Completion Rate), the average working days required per request (Avg Working Day), and total patterns delivered to workshops (Total Delivery):  
   <img src="user_guide_images/en/step_kpi_card.png" style="max-width: 400px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);" />
2. **Analyze 6 Activity Charts**:
   * **Monthly Input** (Distribution of registered requests per month):  
     <img src="user_guide_images/en/step_chart_monthly_input.png" style="max-width: 600px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * **Customer distribution** (Breakdown of request distribution across different brands):  
     <img src="user_guide_images/en/step_chart_customer_distribution.png" style="max-width: 600px; width: 100%; display: block; margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 6px;" />
   * The dashboard features 6 dynamically aligned charts reflecting real-time database modifications:
     <div class="image-container" style="text-align: center; margin: 24px 0; page-break-inside: avoid;">
       <img src="user_guide_images/en/gui_dashboard.png" alt="Statistics Dashboard Page Layout" style="width: 100%; max-width: 800px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.06);" />
       <p style="font-size: 12px; color: #64748b; margin-top: 8px; font-style: italic;">Figure 4.1: High-end charts and KPI dashboards representing pattern maker productivity</p>
     </div>

---

## 5. Advanced Features & Help

* **Real-time Synchronization**: Powered by a robust WebSocket server, any progress updates made by technicians are pushed immediately to all active requestor tracking grids and management dashboards without requiring manual page reloads (F5).
* **Transparent Audit History**: Every request record tracks audit info showing the last user who updated the record and the exact modification timestamp for verification.
* **Account Info & Access Menu**: Users can check security roles, permissions, or execute logout by clicking on their avatar in the top right header:  
   <div class="image-container" style="text-align: center; margin: 24px 0; page-break-inside: avoid;">
     <img src="user_guide_images/en/gui_account_menu.png" alt="User Profile Dropdown" style="width: 45%; max-width: 500px; width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.06);" />
     <p style="font-size: 12px; color: #64748b; margin-top: 8px; font-style: italic;">Figure 5.1: Account dropdown menu showing logged employee code and permissions</p>
   </div>

---

> [!TIP]
> **Operational Shortcuts:**
> * Instead of clicking the editing icon, double-click any row on the grid list to quickly open its detailed info panel or admin progress drawer.
> * Export the request list instantly to an Excel-compatible spreadsheet (CSV) by clicking the **Export** button at the top left of the grid.
