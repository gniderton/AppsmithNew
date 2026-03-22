export default {
  saveEmployee: async () => {
    try {
      // 1. Submit to API
      const response = await createEmployee.run();
      
      // 2. Success Alert
      showAlert(`Employee Created! Code assigned: ${response.employee_code}`, "success");
      
      // 3. Reset and Refresh
      resetWidget("JSONFormCreateEmployee");
      getEmployeeList.run(); 
      
    } catch (error) {
      showAlert(error.message || "Failed to create employee", "error");
    }
  }
}
