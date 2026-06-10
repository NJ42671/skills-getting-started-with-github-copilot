document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      renderActivities(activities);
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function createParticipantList(details, activityName) {
    if (!details.participants.length) {
      const emptyNote = document.createElement("p");
      emptyNote.className = "no-participants";
      emptyNote.textContent = "No participants yet.";
      return emptyNote;
    }

    const participantList = document.createElement("ul");
    participantList.className = "participant-list";

    details.participants.forEach((email) => {
      const participantItem = document.createElement("li");
      participantItem.className = "participant-item";

      const emailSpan = document.createElement("span");
      emailSpan.textContent = email;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "participant-remove";
      removeButton.textContent = "×";
      removeButton.title = `Remove ${email}`;
      removeButton.dataset.activity = activityName;
      removeButton.dataset.email = email;

      participantItem.appendChild(emailSpan);
      participantItem.appendChild(removeButton);
      participantList.appendChild(participantItem);
    });

    return participantList;
  }

  function renderActivities(activities) {
    activitiesList.innerHTML = "";
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    Object.entries(activities).forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";
      activityCard.dataset.activity = name;

      const spotsLeft = details.max_participants - details.participants.length;
      const participantList = createParticipantList(details, name);

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-section">
          <h5>Participants</h5>
        </div>
      `;

      activityCard.querySelector(".participants-section").appendChild(participantList);
      activitiesList.appendChild(activityCard);

      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  async function unregisterParticipant(activityName, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "Unable to unregister participant.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering participant:", error);
    }
  }

  function createParticipantItemElement(activityName, email) {
    const participantItem = document.createElement("li");
    participantItem.className = "participant-item";

    const emailSpan = document.createElement("span");
    emailSpan.textContent = email;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "participant-remove";
    removeButton.textContent = "×";
    removeButton.title = `Remove ${email}`;
    removeButton.dataset.activity = activityName;
    removeButton.dataset.email = email;

    participantItem.appendChild(emailSpan);
    participantItem.appendChild(removeButton);
    return participantItem;
  }

  function addParticipantToDOM(activityName, email) {
    const card = Array.from(activitiesList.querySelectorAll('.activity-card')).find(c => c.dataset.activity === activityName);
    if (!card) return;

    const participantsSection = card.querySelector('.participants-section');
    if (!participantsSection) return;

    // If there's a no-participants note, remove it and add a list
    const noParticipants = participantsSection.querySelector('.no-participants');
    let list = participantsSection.querySelector('.participant-list');
    if (noParticipants) {
      noParticipants.remove();
    }
    if (!list) {
      list = document.createElement('ul');
      list.className = 'participant-list';
      participantsSection.appendChild(list);
    }

    // Append the new participant
    const item = createParticipantItemElement(activityName, email);
    list.appendChild(item);

    // Update availability text
    const availabilityP = Array.from(card.querySelectorAll('p')).find(p => p.textContent.includes('Availability'));
    if (availabilityP) {
      const parts = availabilityP.textContent.split(':');
      // Recalculate spots left by counting list items and max participants from activities data if available
      const activityData = null; // keep DOM-driven if backend data not present here
      const spotsLeftMatch = availabilityP.textContent.match(/(\d+) spots left/);
      if (spotsLeftMatch) {
        const currentSpots = parseInt(spotsLeftMatch[1], 10);
        const newSpots = currentSpots - 1;
        availabilityP.innerHTML = `<strong>Availability:</strong> ${newSpots} spots left`;
      }
    }
  }

  activitiesList.addEventListener("click", async (event) => {
    const button = event.target.closest(".participant-remove");
    if (!button) return;

    const activityName = button.dataset.activity;
    const email = button.dataset.email;
    await unregisterParticipant(activityName, email);
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Optimistic UI update: add participant immediately
        addParticipantToDOM(activity, email);
        // Refresh in background to sync with server
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  fetchActivities();
});
