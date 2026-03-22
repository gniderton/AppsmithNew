export default {
  handleSalaryUpdate: async () => {
    try {
      await updateSalary.run();
      showAlert("Salary Updated Successfully!", "success");
      closeModal("ModalUpdateSalary");
			showModal(ModalProfile.name);
      getEmployeeList.run();
			getSalaryHistory.run();// Refresh the list to see the new salary
    } catch (error) {
      showAlert(error.message, "error");
    }
  }
}
