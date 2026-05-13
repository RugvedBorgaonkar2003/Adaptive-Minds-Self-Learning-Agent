# Reinforcement Learning Fundamentals — Chapter Notes

## TL;DR
Reinforcement Learning (RL) is a subfield of Machine Learning where an agent learns to take actions in an environment to maximize a reward. The agent explores the environment, collects experiences, and uses them to improve its policy. RL involves two key activities: exploration and training.

## Key Concepts

### Agent
* **Definition**: An agent is an entity that interacts with an environment to achieve a goal.
* **Role**: The agent takes actions in the environment and receives rewards or penalties based on its performance.
* **Types**: There are two types of agents: model-based and model-free. Model-based agents learn a model of the environment dynamics, while model-free agents learn directly from experiences.

### Environment
* **Definition**: An environment is the external world that the agent interacts with.
* **Role**: The environment provides the agent with observations, rewards, and penalties based on its actions.
* **Types**: Environments can be deterministic or stochastic, and can have discrete or continuous action spaces.

### State
* **Definition**: A state is a description of the environment at a particular point in time.
* **Role**: The state provides the agent with information about the environment, which it uses to decide its next action.
* **Types**: States can be represented as vectors, images, or other data structures.

### Action
* **Definition**: An action is a decision made by the agent to interact with the environment.
* **Role**: The action is the output of the agent's policy, which determines the next state and reward.
* **Types**: Actions can be discrete or continuous, and can have different types (e.g., movement, rotation, etc.).

### Reward
* **Definition**: A reward is a numerical value assigned to the agent based on its performance.
* **Role**: The reward is used to evaluate the agent's policy and guide its learning process.
* **Types**: Rewards can be positive (for good actions) or negative (for bad actions).

### Exploration and Training
* **Definition**: Exploration is the process of collecting experiences in the environment, while training is the process of improving the agent's policy based on those experiences.
* **Role**: Exploration and training are the two key activities in RL, and they are intertwined.
* **Types**: There are different exploration strategies (e.g., epsilon-greedy, entropy-based) and training algorithms (e.g., Q-learning, policy gradients).

### Q-Learning
* **Definition**: Q-learning is a model-free RL algorithm that learns the action-value function (Q-function) to determine the best action to take in a given state.
* **Role**: Q-learning is used to learn the Q-function, which is used to determine the best action to take in a given state.
* **Equation**: Q(s, a) = r + γ * max_a Q(s', a')

### Deep Q-Networks (DQNs)
* **Definition**: DQNs are a type of neural network that approximates the Q-function using a deep neural network.
* **Role**: DQNs are used to learn the Q-function in complex environments.
* **Architecture**: DQNs typically consist of a convolutional neural network (CNN) or a recurrent neural network (RNN) followed by a fully connected layer.

### Policy Gradient Methods
* **Definition**: Policy gradient methods are a type of RL algorithm that learns the policy directly by optimizing the expected cumulative reward.
* **Role**: Policy gradient methods are used to learn the policy in complex environments.
* **Equation**: J(θ) = E[R(θ, s, a)]

## Key Takeaways

* Reinforcement Learning is a subfield of Machine Learning where an agent learns to take actions in an environment to maximize a reward.
* The agent explores the environment, collects experiences, and uses them to improve its policy.
* RL involves two key activities: exploration and training.
* The agent learns the Q-function or policy directly using different algorithms (e.g., Q-learning, policy gradients).
* DQNs are a type of neural network that approximates the Q-function using a deep neural network.

## Common Mistakes to Avoid

* **Overestimation of Q-values**: Q-learning can suffer from overestimation of Q-values, which can lead to suboptimal policies.
* **Insufficient Exploration**: Insufficient exploration can lead to poor performance and slow learning.
* **Incorrect Reward Design**: Incorrect reward design can lead to suboptimal policies and slow learning.