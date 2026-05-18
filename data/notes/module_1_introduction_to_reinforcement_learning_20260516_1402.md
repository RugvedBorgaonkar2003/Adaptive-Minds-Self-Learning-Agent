# Module 1: Introduction to Reinforcement Learning — Chapter Notes

## TL;DR
Reinforcement learning is a type of machine learning where an agent learns to interact with an environment by taking actions and receiving feedback (rewards or penalties). The agent learns to optimize its behavior to maximize rewards through trial and error interactions with the environment. Key concepts include the agent, environment, state, action, reward, policy, and value function.

## Key Concepts

### Agent
* **Definition**: The agent is the sole decision-maker and learner in the reinforcement learning framework.
* **Role**: The agent interacts with the environment, takes actions, and receives feedback in the form of rewards or penalties.
* **Example**: A robot navigating a maze to reach a goal is an example of an agent.

### Environment
* **Definition**: The environment is the physical world where the agent learns and decides the actions to be performed.
* **Role**: The environment provides feedback to the agent in the form of rewards or penalties for its actions.
* **Example**: A game environment where the agent must collect coins to reach the goal is an example of an environment.

### State
* **Definition**: The state is the current situation of the agent in the environment.
* **Role**: The state is used to determine the next action to be taken by the agent.
* **Example**: The position and velocity of a robot in a maze are examples of state.

### Action
* **Definition**: An action is the agent's single choice (move left, pick up object) in the environment.
* **Role**: The action is used to interact with the environment and receive feedback in the form of rewards or penalties.
* **Example**: Moving left or right in a maze are examples of actions.

### Reward
* **Definition**: The reward is the feedback provided by the environment to the agent for its actions.
* **Role**: The reward is used to determine the goodness or badness of an action.
* **Example**: A positive reward for collecting a coin in a game is an example of a reward.

### Policy
* **Definition**: The policy is the agent's strategy (decision-making) to map situations to actions.
* **Role**: The policy is used to determine the next action to be taken by the agent.
* **Example**: A policy to move left or right in a maze based on the current state is an example of a policy.

### Value Function
* **Definition**: The value function is the value of a state that shows up the reward achieved starting from the state until the policy is executed.
* **Role**: The value function is used to determine the goodness or badness of a state.
* **Example**: The value function for a state in a maze is the expected reward that can be achieved starting from that state.

### Types of Reinforcement Learning
#### Value-Based
* **Definition**: Value-based learning trains RL agents by learning the value of being in specific states.
* **Role**: The goal is to find the optimal policy that leads to the highest expected future rewards.
* **Example**: Q-learning is an example of value-based learning.

#### Policy-Based
* **Definition**: Policy-based learning directly learns the policy function, which maps states to actions.
* **Role**: The goal is to find the optimal policy that leads to the highest expected future rewards.
* **Example**: REINFORCE and Proximal Policy Optimization (PPO) are examples of policy-based learning.

## Key Takeaways

* Reinforcement learning is a type of machine learning where an agent learns to interact with an environment by taking actions and receiving feedback (rewards or penalties).
* The agent learns to optimize its behavior to maximize rewards through trial and error interactions with the environment.
* Key concepts include the agent, environment, state, action, reward, policy, and value function.
* There are two types of reinforcement learning: value-based and policy-based.

## Common Mistakes to Avoid

* **Misunderstanding the role of the environment**: The environment provides feedback to the agent in the form of rewards or penalties, but it does not directly interact with the agent.
* **Confusing policy and value function**: The policy is the agent's strategy to map situations to actions, while the value function is the value of a state that shows up the reward achieved starting from the state until the policy is executed.
* **Not understanding the difference between value-based and policy-based learning**: Value-based learning trains RL agents by learning the value of being in specific states, while policy-based learning directly learns the policy function, which maps states to actions.