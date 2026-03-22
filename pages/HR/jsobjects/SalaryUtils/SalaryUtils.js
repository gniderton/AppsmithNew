export default {
  getBulkPayload: () => {
    const salaries = appsmith.store.bulkSalaries || [];
    return salaries.map(row => ({
      employee_id: row.id,
      new_salary: Number(row.new_salary)
    }));
  }
}
